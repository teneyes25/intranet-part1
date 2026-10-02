import { randomUUID } from "node:crypto";

import { createChildLogger } from "../logger";
import { sha256 } from "./hash";
import { DEFAULT_KNOWLEDGE_LIMITS, type KnowledgeLimits } from "./limits";
import { originalObjectKey, previewObjectKey } from "./storage";
import type { StorageAdapter } from "./storage";
import {
  describeStorageFailure,
  isAmbiguousStorageError,
  unresolvedStorageRecord,
  type StorageFailureRecord,
  type UnresolvedStorageRecord,
} from "./storage-error";
import type { KnowledgeRepository } from "./repository";
import type {
  JobLease,
  KnowledgeChunk,
  KnowledgeContext,
  KnowledgeEvent,
  KnowledgeJobRow,
  KnowledgeSearchHit,
  SyncServiceContext,
  UserContext,
} from "./types";

const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);
const knowledgeStorageLogger = createChildLogger("knowledge.storage");

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function eventFingerprint(event: KnowledgeEvent) {
  return JSON.stringify([
    event.documentId,
    event.sequence,
    event.type,
    event.versionId ?? null,
    event.allowedGroups ?? null,
  ]);
}

function extractText(bytes: Buffer, limits: KnowledgeLimits): KnowledgeChunk[] {
  const text = bytes.toString("utf8").trim();
  requireValue(text.length > 0, "empty extraction");
  const chunks = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((content, i) => ({
      chunkId: `${i}`,
      content,
      locator: { paragraph: i + 1 },
    }));
  assertChunks(chunks, limits);
  return chunks;
}

function assertChunks(chunks: KnowledgeChunk[], limits: KnowledgeLimits) {
  requireValue(chunks.length > 0, "empty extraction");
  requireValue(chunks.length <= limits.maxChunks, "too many chunks");
  for (const chunk of chunks) {
    requireValue(chunk.content.length <= limits.maxChunkChars, "chunk too large");
  }
}

export class KnowledgeService {
  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageAdapter,
    private readonly opts: {
      now?: () => number;
      aclTtlMs?: number;
      limits?: Partial<KnowledgeLimits>;
      retryDelayMs?: (attempts: number) => number;
      extractor?: (bytes: Buffer) => string | KnowledgeChunk[] | never;
      beforeIndexPublish?: () => Promise<void>;
      onCleanupFailure?: (failures: StorageFailureRecord[]) => void;
      onUnresolvedStorage?: (record: UnresolvedStorageRecord) => void;
    } = {},
  ) {}

  private now() {
    return this.opts.now?.() ?? Date.now();
  }

  private aclTtlMs() {
    return this.opts.aclTtlMs ?? 300_000;
  }

  private limits(): KnowledgeLimits {
    return { ...DEFAULT_KNOWLEDGE_LIMITS, ...this.opts.limits };
  }

  private requireService(ctx: KnowledgeContext): asserts ctx is SyncServiceContext {
    requireValue(ctx?.kind === "sync-service" && ctx.tenantId, "unauthorized");
  }

  private async discard(keys: string[]) {
    const failures: StorageFailureRecord[] = [];
    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        const failure = describeStorageFailure(key, error);
        failures.push(failure);
        knowledgeStorageLogger.error(
          {
            key: failure.key,
            errorName: failure.errorName,
            httpStatus: failure.httpStatus,
          },
          "knowledge storage cleanup failed",
        );
      }
    }
    if (failures.length > 0) this.opts.onCleanupFailure?.(failures);
  }

  private recordUnresolved(key: string, error: unknown) {
    const record = unresolvedStorageRecord(key, error);
    knowledgeStorageLogger.error(
      {
        key: record.key,
        outcome: record.outcome,
        reconciliationRequired: record.reconciliationRequired,
        cleanupRequired: record.cleanupRequired,
        errorName: record.errorName,
        httpStatus: record.httpStatus,
      },
      "knowledge storage outcome uncertain; reconciliation and cleanup required",
    );
    this.opts.onUnresolvedStorage?.(record);
  }

  async upload(
    ctx: KnowledgeContext,
    input: {
      documentId: string;
      title: string;
      bytes: Buffer;
      expectedHash: string;
      mimeType: string;
      filename?: string;
      attachmentId?: string;
      previewBytes?: Buffer;
    },
  ) {
    this.requireService(ctx);
    const limits = this.limits();
    requireValue(
      typeof input.documentId === "string" && input.documentId.length > 0,
      "document ID required",
    );
    requireValue(Buffer.isBuffer(input.bytes), "bytes required");
    requireValue(input.bytes.length <= limits.maxOriginalBytes, "file too large");
    requireValue(
      !input.previewBytes || input.previewBytes.length <= limits.maxPreviewBytes,
      "file too large",
    );
    requireValue(sha256(input.bytes) === input.expectedHash, "hash mismatch");

    const versionId = randomUUID();
    const storageKey = originalObjectKey(ctx.tenantId, versionId);
    const written: string[] = [];
    let pendingKey: string | null = null;
    try {
      pendingKey = storageKey;
      await this.storage.put(storageKey, Buffer.from(input.bytes));
      pendingKey = null;
      written.push(storageKey);
      const stored = await this.storage.get(storageKey);
      requireValue(sha256(stored) === input.expectedHash, "stored hash mismatch");

      let previewKey: string | null = null;
      if (input.previewBytes) {
        previewKey = previewObjectKey(ctx.tenantId, versionId);
        pendingKey = previewKey;
        await this.storage.put(previewKey, Buffer.from(input.previewBytes));
        pendingKey = null;
        written.push(previewKey);
      }

      await this.repo.transaction(async (tx) => {
        let doc = await tx.getDoc(ctx.tenantId, input.documentId, true);
        if (!doc) {
          doc = await tx.insertDoc({
            id: input.documentId,
            tenantId: ctx.tenantId,
            title: input.title,
          });
        }
        await tx.insertVersion({
          id: versionId,
          tenantId: ctx.tenantId,
          documentId: input.documentId,
          filename: input.filename ?? `${input.documentId}.txt`,
          mimeType: input.mimeType,
          size: input.bytes.length,
          sha256: input.expectedHash,
          storageKey,
          previewKey,
          attachmentId: input.attachmentId ?? null,
          status: "STORED",
          chunks: null,
          indexGeneration: 0,
          indexedAt: null,
        });
        if (
          !doc.approvedVersionId &&
          !doc.revoked &&
          doc.processingStatus !== "STORED"
        ) {
          const patched = await tx.patchDoc(ctx.tenantId, doc.id, doc.stateRevision, {
            processingStatus: "STORED",
          });
          requireValue(patched, "document changed");
        }
      });
    } catch (error) {
      if (pendingKey && isAmbiguousStorageError(error)) this.recordUnresolved(pendingKey, error);
      await this.discard(written);
      throw error;
    }

    return {
      documentId: input.documentId,
      versionId,
      hash: input.expectedHash,
      status: "STORED" as const,
    };
  }

  async applyEvent(ctx: KnowledgeContext, event: KnowledgeEvent) {
    this.requireService(ctx);
    requireValue(
      typeof event.eventId === "string" && event.eventId.length > 0,
      "event ID required",
    );
    requireValue(
      ["APPROVE", "ACL", "REVOKE"].includes(event.type),
      "invalid event type",
    );
    const fingerprint = eventFingerprint(event);

    return this.repo.transaction(async (tx) => {
      const doc = await tx.getDoc(ctx.tenantId, event.documentId, true);
      requireValue(doc, "not found");
      const existing = await tx.getEvent(ctx.tenantId, event.eventId);
      if (existing) {
        requireValue(existing.fingerprint === fingerprint, "event ID conflict");
        return { duplicate: true as const };
      }
      requireValue(
        Number.isSafeInteger(event.sequence) && event.sequence === doc.sequence + 1,
        "sequence gap or stale event",
      );

      if (event.type === "APPROVE") {
        requireValue(event.versionId, "version not stored");
        const version = await tx.getVersion(ctx.tenantId, doc.id, event.versionId);
        requireValue(version, "version not stored");
        requireValue(
          Array.isArray(event.allowedGroups) &&
            event.allowedGroups.every((g) => typeof g === "string"),
          "ACL required",
        );
        const aclRevision = doc.aclRevision + 1;
        await tx.replaceAcls(ctx.tenantId, doc.id, aclRevision, event.allowedGroups ?? []);
        await tx.insertEvent({
          id: event.eventId,
          tenantId: ctx.tenantId,
          documentId: doc.id,
          sequence: event.sequence,
          type: event.type,
          versionId: event.versionId,
          aclRevision,
          fingerprint,
          payload: event,
        });
        const patched = await tx.patchDoc(ctx.tenantId, doc.id, doc.stateRevision, {
          approvedVersionId: event.versionId,
          revoked: false,
          aclRevision,
          aclAt: new Date(this.now()),
          processingStatus: "PROCESSING",
          sequence: event.sequence,
        });
        requireValue(patched, "document changed");
        await tx.insertJob({
          eventId: event.eventId,
          tenantId: ctx.tenantId,
          documentId: doc.id,
          type: "INDEX",
          versionId: event.versionId,
          maxAttempts: this.limits().maxAttempts,
        });
        return { duplicate: false as const, sequence: event.sequence };
      }

      if (event.type === "ACL") {
        requireValue(
          Array.isArray(event.allowedGroups) &&
            event.allowedGroups.every((g) => typeof g === "string"),
          "ACL required",
        );
        const aclRevision = doc.aclRevision + 1;
        await tx.replaceAcls(ctx.tenantId, doc.id, aclRevision, event.allowedGroups ?? []);
        await tx.insertEvent({
          id: event.eventId,
          tenantId: ctx.tenantId,
          documentId: doc.id,
          sequence: event.sequence,
          type: event.type,
          versionId: event.versionId,
          aclRevision,
          fingerprint,
          payload: event,
        });
        const patched = await tx.patchDoc(ctx.tenantId, doc.id, doc.stateRevision, {
          aclRevision,
          aclAt: new Date(this.now()),
          sequence: event.sequence,
        });
        requireValue(patched, "document changed");
        return { duplicate: false as const, sequence: event.sequence };
      }

      await tx.insertEvent({
        id: event.eventId,
        tenantId: ctx.tenantId,
        documentId: doc.id,
        sequence: event.sequence,
        type: event.type,
        versionId: event.versionId,
        aclRevision: doc.aclRevision,
        fingerprint,
        payload: event,
      });
      const patched = await tx.patchDoc(ctx.tenantId, doc.id, doc.stateRevision, {
        revoked: true,
        activeVersionId: null,
        approvedVersionId: null,
        processingStatus: "READY",
        sequence: event.sequence,
      });
      requireValue(patched, "document changed");
      return { duplicate: false as const, sequence: event.sequence };
    });
  }

  private leaseFrom(job: KnowledgeJobRow): JobLease {
    requireValue(job.leaseOwner && job.leaseFence && job.leaseUntil, "lease lost");
    return {
      jobId: job.id,
      tenantId: job.tenantId,
      leaseOwner: job.leaseOwner,
      leaseFence: job.leaseFence,
      leaseUntil: job.leaseUntil,
    };
  }

  /** Document row first, then the job row. */
  private async assertHeldLease(tx: KnowledgeRepository, lease: JobLease) {
    const job = await tx.getJobForUpdate(lease.tenantId, lease.jobId);
    const until = job?.leaseUntil?.getTime() ?? 0;
    requireValue(
      job &&
        job.status === "PROCESSING" &&
        job.leaseOwner === lease.leaseOwner &&
        job.leaseFence === lease.leaseFence &&
        until > this.now(),
      "lease lost",
    );
  }

  async indexApprovedText(
    ctx: KnowledgeContext,
    input: {
      documentId: string;
      versionId: string;
      lease?: JobLease;
      extractor?: (bytes: Buffer) => string | KnowledgeChunk[] | never;
    },
  ) {
    this.requireService(ctx);
    const limits = this.limits();
    const doc = await this.repo.getDoc(ctx.tenantId, input.documentId);
    requireValue(doc, "not found");
    requireValue(
      !doc.revoked && doc.approvedVersionId === input.versionId,
      "not approved version",
    );
    const version = await this.repo.getVersion(
      ctx.tenantId,
      input.documentId,
      input.versionId,
    );
    requireValue(version, "version not stored");
    requireValue(TEXT_TYPES.has(version.mimeType), "unsupported format");

    const bytes = await this.storage.get(version.storageKey);
    requireValue(sha256(bytes) === version.sha256, "stored hash mismatch");

    try {
      const extractor = input.extractor ?? this.opts.extractor;
      const extracted = extractor
        ? extractor(Buffer.from(bytes))
        : extractText(bytes, limits);
      const chunks = Array.isArray(extracted)
        ? extracted
        : extractText(Buffer.from(extracted, "utf8"), limits);
      assertChunks(
        chunks.map((chunk, i) => ({
          ...chunk,
          chunkId: `${input.versionId}:${i}`,
        })),
        limits,
      );
      const readyChunks = chunks.map((chunk, i) => ({
        ...chunk,
        chunkId: `${input.versionId}:${i}`,
      }));

      if (this.opts.beforeIndexPublish) await this.opts.beforeIndexPublish();

      await this.repo.transaction(async (tx) => {
        const latest = await tx.getDoc(ctx.tenantId, input.documentId, true);
        requireValue(latest, "not found");
        if (input.lease) await this.assertHeldLease(tx, input.lease);
        requireValue(
          !latest.revoked && latest.approvedVersionId === input.versionId,
          "approval changed",
        );
        const current = await tx.getVersion(
          ctx.tenantId,
          input.documentId,
          input.versionId,
        );
        requireValue(current, "version not stored");
        current.chunks = readyChunks;
        current.status = "READY";
        current.indexGeneration += 1;
        current.indexedAt = new Date(this.now());
        await tx.saveVersion(current);
        const patched = await tx.patchDoc(
          ctx.tenantId,
          latest.id,
          latest.stateRevision,
          {
            activeVersionId: input.versionId,
            processingStatus: "READY",
          },
        );
        requireValue(patched, "approval changed");
      });
    } catch (error) {
      if (!(error instanceof Error && error.message === "lease lost")) {
        await this.markIndexFailed(ctx, input.documentId, input.versionId, input.lease).catch(
          () => undefined,
        );
      }
      throw error;
    }
  }

  private async markIndexFailed(
    ctx: SyncServiceContext,
    documentId: string,
    versionId: string,
    lease?: JobLease,
  ) {
    await this.repo.transaction(async (tx) => {
      const doc = await tx.getDoc(ctx.tenantId, documentId, true);
      if (lease) {
        try {
          await this.assertHeldLease(tx, lease);
        } catch {
          return;
        }
      }
      if (!doc || doc.revoked || doc.approvedVersionId !== versionId) return;
      if (doc.activeVersionId === versionId) return;
      await tx.markVersionFailed(ctx.tenantId, documentId, versionId);
      const patched = await tx.patchDoc(ctx.tenantId, doc.id, doc.stateRevision, {
        processingStatus: doc.activeVersionId ? "READY" : "FAILED",
      });
      requireValue(patched, "document changed");
    });
  }

  private async authorized(ctx: KnowledgeContext, documentId: string) {
    requireValue(ctx.kind === "user" && ctx.active === true, "unauthorized");
    const user = ctx as UserContext;
    const doc = await this.repo.getDoc(user.tenantId, documentId);
    if (!doc || doc.revoked || !doc.activeVersionId || !doc.aclAt) return null;
    if (this.now() - doc.aclAt.getTime() >= this.aclTtlMs()) return null;
    const groups = await this.repo.getAclGroups(
      user.tenantId,
      doc.id,
      doc.aclRevision,
    );
    if (!user.groups.some((g) => groups.includes(g))) return null;
    const version = await this.repo.getVersion(
      user.tenantId,
      doc.id,
      doc.activeVersionId,
    );
    if (!version || version.status !== "READY") return null;
    return { doc, version, user };
  }

  async search(ctx: KnowledgeContext, query: string): Promise<KnowledgeSearchHit[]> {
    requireValue(ctx?.kind === "user" && ctx.active === true, "unauthorized");
    const limits = this.limits();
    requireValue(typeof query === "string" && query.trim().length > 0, "query required");
    requireValue(query.trim().length <= limits.maxQueryChars, "query too large");
    const needle = query.trim().toLowerCase();
    const hits: KnowledgeSearchHit[] = [];
    const ids = await this.repo.listDocumentIds(ctx.tenantId);
    for (const id of ids) {
      const allowed = await this.authorized(ctx, id);
      if (!allowed) continue;
      for (const chunk of allowed.version.chunks ?? []) {
        if (!chunk.content.toLowerCase().includes(needle)) continue;
        hits.push({
          documentId: allowed.doc.id,
          title: allowed.doc.title,
          versionId: allowed.version.id,
          hash: allowed.version.sha256,
          chunkId: chunk.chunkId,
          content: chunk.content.slice(0, limits.maxHitChars),
          locator: chunk.locator,
          indexedAt: allowed.version.indexedAt?.getTime() ?? null,
          aclAt: allowed.doc.aclAt?.getTime() ?? null,
        });
        if (hits.length >= limits.maxSearchHits) return hits;
      }
    }
    return hits;
  }

  async download(ctx: KnowledgeContext, documentId: string, versionId: string) {
    const allowed = await this.authorized(ctx, documentId);
    requireValue(allowed && versionId === allowed.version.id, "forbidden");
    const version = await this.repo.getVersion(
      allowed!.user.tenantId,
      allowed!.doc.id,
      versionId,
    );
    requireValue(version, "forbidden");
    const bytes = await this.storage.get(version.storageKey);
    requireValue(sha256(bytes) === version.sha256, "stored hash mismatch");
    return Buffer.from(bytes);
  }

  async assignStaffGroups(ctx: KnowledgeContext, userId: string, groups: string[]) {
    this.requireService(ctx);
    requireValue(typeof userId === "string" && userId.length > 0, "user required");
    requireValue(
      Array.isArray(groups) && groups.every((group) => typeof group === "string" && group.length > 0),
      "groups required",
    );
    await this.repo.replaceStaffGroups(ctx.tenantId, userId, groups);
  }

  async listStaffGroups(tenantId: string, userId: string) {
    return this.repo.listStaffGroups(tenantId, userId);
  }

  async recoverExpiredJobs(ctx: KnowledgeContext) {
    this.requireService(ctx);
    return this.repo.reclaimExpiredJobs(ctx.tenantId, new Date(this.now()));
  }

  async processJobs(ctx: KnowledgeContext) {
    this.requireService(ctx);
    await this.recoverExpiredJobs(ctx);
    const workerId = randomUUID();
    const results: { id: string; status: string; error?: string }[] = [];
    for (;;) {
      const job = await this.repo.claimNextJob(
        ctx.tenantId,
        workerId,
        randomUUID(),
        new Date(this.now()),
        new Date(this.now() + this.limits().leaseMs),
      );
      if (!job) break;
      results.push(await this.runClaimedJob(ctx, job));
    }
    return results;
  }

  private async runClaimedJob(ctx: SyncServiceContext, job: KnowledgeJobRow) {
    const finish = async (
      status: string,
      error: string | null,
      completed: boolean,
    ) => {
      const delay = this.opts.retryDelayMs?.(job.attempts) ??
        Math.min(60_000 * job.attempts, 15 * 60_000);
      const ok = await this.repo.finishJob(this.leaseFrom(job), new Date(this.now()), {
        status,
        attempts: job.attempts,
        nextRetryAt: status === "FAILED" ? new Date(this.now() + delay) : null,
        lastError: error,
        completedAt: completed ? new Date(this.now()) : null,
      });
      return ok
        ? { id: job.id, status, error: error ?? undefined }
        : { id: job.id, status: "LOST_LEASE", error: "lease lost" };
    };

    const doc = await this.repo.getDoc(job.tenantId, job.documentId);
    if (!job.versionId || !doc || doc.revoked || doc.approvedVersionId !== job.versionId) {
      const reason = !doc || doc.revoked ? "revoked" : "version replaced";
      return finish("SUPERSEDED", reason, true);
    }

    try {
      await this.indexApprovedText(ctx, {
        documentId: doc.id,
        versionId: job.versionId,
        lease: this.leaseFrom(job),
      });
      return finish("DONE", null, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "index_failed";
      if (message === "lease lost") {
        return { id: job.id, status: "LOST_LEASE", error: "lease lost" };
      }
      if (
        message === "not approved version" ||
        message === "approval changed" ||
        message === "not found"
      ) {
        return finish("SUPERSEDED", message, true);
      }
      if (job.attempts >= job.maxAttempts) {
        return finish("EXHAUSTED", message, true);
      }
      return finish("FAILED", message, false);
    }
  }

  async listJobStatus(tenantId: string) {
    return this.repo.listJobs({ tenantId });
  }
}

export type { KnowledgeChunk } from "./types";
