import { randomUUID } from "node:crypto";

import { sha256 } from "./hash";
import { originalObjectKey } from "./storage";
import type { StorageAdapter } from "./storage";
import type { KnowledgeRepository } from "./repository";
import type {
  KnowledgeChunk,
  KnowledgeContext,
  KnowledgeEvent,
  KnowledgeSearchHit,
  SyncServiceContext,
  UserContext,
} from "./types";

const TEXT_TYPES = new Set(["text/plain", "text/markdown"]);

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

function extractText(bytes: Buffer) {
  const text = bytes.toString("utf8").trim();
  requireValue(text.length > 0, "empty extraction");
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((content, i) => ({
      chunkId: `${i}`,
      content,
      locator: { paragraph: i + 1 },
    }));
}

export class KnowledgeService {
  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly storage: StorageAdapter,
    private readonly opts: {
      now?: () => number;
      aclTtlMs?: number;
    } = {},
  ) {}

  private now() {
    return this.opts.now?.() ?? Date.now();
  }

  private aclTtlMs() {
    return this.opts.aclTtlMs ?? 300_000;
  }

  private requireService(ctx: KnowledgeContext): asserts ctx is SyncServiceContext {
    requireValue(ctx?.kind === "sync-service" && ctx.tenantId, "unauthorized");
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
    requireValue(
      typeof input.documentId === "string" && input.documentId.length > 0,
      "document ID required",
    );
    requireValue(Buffer.isBuffer(input.bytes), "bytes required");
    requireValue(sha256(input.bytes) === input.expectedHash, "hash mismatch");

    const versionId = randomUUID();
    const storageKey = originalObjectKey(ctx.tenantId, versionId);
    await this.storage.put(storageKey, Buffer.from(input.bytes));
    const stored = await this.storage.get(storageKey);
    requireValue(sha256(stored) === input.expectedHash, "stored hash mismatch");

    let previewKey: string | null = null;
    if (input.previewBytes) {
      previewKey = `previews/${ctx.tenantId}/${versionId}`;
      await this.storage.put(previewKey, Buffer.from(input.previewBytes));
    }

    await this.repo.transaction(async (tx) => {
      let doc = await tx.getDoc(ctx.tenantId, input.documentId);
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
      doc.processingStatus = "STORED";
      await tx.saveDoc(doc);
    });

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
      const existing = await tx.getEvent(ctx.tenantId, event.eventId);
      if (existing) {
        requireValue(existing.fingerprint === fingerprint, "event ID conflict");
        return { duplicate: true as const };
      }

      const doc = await tx.getDoc(ctx.tenantId, event.documentId);
      requireValue(doc, "not found");
      requireValue(
        Number.isSafeInteger(event.sequence) && event.sequence === doc.sequence + 1,
        "sequence gap or stale event",
      );

      if (event.type === "APPROVE") {
        requireValue(event.versionId, "version not stored");
        const version = await tx.getVersion(event.versionId);
        requireValue(version && version.documentId === doc.id, "version not stored");
        requireValue(
          Array.isArray(event.allowedGroups) &&
            event.allowedGroups.every((g) => typeof g === "string"),
          "ACL required",
        );
        doc.approvedVersionId = event.versionId;
        doc.revoked = false;
        doc.aclRevision += 1;
        doc.aclAt = new Date(this.now());
        doc.processingStatus = "PROCESSING";
        await tx.replaceAcls(
          ctx.tenantId,
          doc.id,
          doc.aclRevision,
          event.allowedGroups ?? [],
        );
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
        doc.sequence = event.sequence;
        await tx.saveDoc(doc);
        await tx.insertJob({
          eventId: event.eventId,
          tenantId: ctx.tenantId,
          documentId: doc.id,
          type: "INDEX",
        });
        return { duplicate: false as const, sequence: event.sequence };
      }

      if (event.type === "ACL") {
        requireValue(
          Array.isArray(event.allowedGroups) &&
            event.allowedGroups.every((g) => typeof g === "string"),
          "ACL required",
        );
        doc.aclRevision += 1;
        doc.aclAt = new Date(this.now());
        await tx.replaceAcls(
          ctx.tenantId,
          doc.id,
          doc.aclRevision,
          event.allowedGroups ?? [],
        );
      } else {
        doc.revoked = true;
        doc.activeVersionId = null;
        doc.approvedVersionId = null;
        doc.processingStatus = "READY";
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
      doc.sequence = event.sequence;
      await tx.saveDoc(doc);
      return { duplicate: false as const, sequence: event.sequence };
    });
  }

  async indexApprovedText(
    ctx: KnowledgeContext,
    input: {
      documentId: string;
      versionId: string;
      extractor?: (bytes: Buffer) => string | KnowledgeChunk[] | never;
    },
  ) {
    this.requireService(ctx);
    const doc = await this.repo.getDoc(ctx.tenantId, input.documentId);
    requireValue(doc, "not found");
    requireValue(
      !doc.revoked && doc.approvedVersionId === input.versionId,
      "not approved version",
    );
    const version = await this.repo.getVersion(input.versionId);
    requireValue(version, "version not stored");
    requireValue(TEXT_TYPES.has(version.mimeType), "unsupported format");

    const bytes = await this.storage.get(version.storageKey);
    requireValue(sha256(bytes) === version.sha256, "stored hash mismatch");

    try {
      const extracted = input.extractor
        ? input.extractor(Buffer.from(bytes))
        : extractText(bytes);
      const chunks = Array.isArray(extracted)
        ? extracted
        : extractText(Buffer.from(extracted, "utf8"));
      requireValue(chunks.length > 0, "empty extraction");

      await this.repo.transaction(async (tx) => {
        const latest = await tx.getDoc(ctx.tenantId, input.documentId);
        requireValue(latest, "not found");
        requireValue(
          !latest.revoked && latest.approvedVersionId === input.versionId,
          "approval changed",
        );
        const current = await tx.getVersion(input.versionId);
        requireValue(current, "version not stored");
        current.chunks = chunks.map((c, i) => ({
          ...c,
          chunkId: `${input.versionId}:${i}`,
        }));
        current.status = "READY";
        current.indexGeneration += 1;
        current.indexedAt = new Date(this.now());
        latest.activeVersionId = input.versionId;
        latest.processingStatus = "READY";
        await tx.saveVersion(current);
        await tx.saveDoc(latest);
      });
    } catch (error) {
      const failed = await this.repo.getVersion(input.versionId);
      if (failed) {
        failed.status = "FAILED";
        await this.repo.saveVersion(failed);
      }
      const latest = await this.repo.getDoc(ctx.tenantId, input.documentId);
      if (latest && latest.activeVersionId !== input.versionId) {
        latest.processingStatus = latest.activeVersionId ? "READY" : "FAILED";
        await this.repo.saveDoc(latest);
      }
      throw error;
    }
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
    const version = await this.repo.getVersion(doc.activeVersionId);
    if (!version || version.status !== "READY") return null;
    return { doc, version, user };
  }

  async search(ctx: KnowledgeContext, query: string): Promise<KnowledgeSearchHit[]> {
    requireValue(ctx?.kind === "user" && ctx.active === true, "unauthorized");
    requireValue(typeof query === "string" && query.trim().length > 0, "query required");
    const needle = query.trim().toLowerCase();
    const hits: KnowledgeSearchHit[] = [];
    const ids = await this.repo.listDocumentIds(ctx.tenantId);
    for (const id of ids) {
      const allowed = await this.authorized(ctx, id);
      if (!allowed) continue;
      for (const chunk of allowed.version.chunks ?? []) {
        if (chunk.content.toLowerCase().includes(needle)) {
          hits.push({
            documentId: allowed.doc.id,
            title: allowed.doc.title,
            versionId: allowed.version.id,
            hash: allowed.version.sha256,
            chunkId: chunk.chunkId,
            content: chunk.content,
            locator: chunk.locator,
            indexedAt: allowed.version.indexedAt?.getTime() ?? null,
            aclAt: allowed.doc.aclAt?.getTime() ?? null,
          });
        }
      }
    }
    return hits;
  }

  async download(ctx: KnowledgeContext, documentId: string, versionId: string) {
    const allowed = await this.authorized(ctx, documentId);
    requireValue(allowed && versionId === allowed.version.id, "forbidden");
    const bytes = await this.storage.get(allowed!.version.storageKey);
    requireValue(sha256(bytes) === allowed!.version.sha256, "stored hash mismatch");
    return Buffer.from(bytes);
  }

  async recoverPendingJobs() {
    return this.repo.resetProcessingToPending();
  }

  async processJobs(ctx: KnowledgeContext) {
    this.requireService(ctx);
    const pending = await this.repo.listJobs({
      status: "PENDING",
      tenantId: ctx.tenantId,
    });
    const results: { id: string; status: string; error?: string }[] = [];
    for (const job of pending) {
      if (job.type !== "INDEX") continue;
      job.status = "PROCESSING";
      job.attempts += 1;
      await this.repo.saveJob(job);
      const event = await this.repo.getEvent(job.tenantId, job.eventId);
      const doc = await this.repo.getDoc(job.tenantId, job.documentId);
      try {
        requireValue(event && doc, "job target missing");
        if (!doc!.approvedVersionId) throw new Error("not approved version");
        await this.indexApprovedText(ctx, {
          documentId: doc!.id,
          versionId: doc!.approvedVersionId,
        });
        job.status = "DONE";
        job.lastError = null;
        job.completedAt = new Date(this.now());
        await this.repo.saveJob(job);
        results.push({ id: job.id, status: "DONE" });
      } catch (error) {
        job.status = "FAILED";
        job.lastError = error instanceof Error ? error.message : "index_failed";
        job.nextRetryAt = new Date(this.now() + Math.min(60_000 * job.attempts, 15 * 60_000));
        await this.repo.saveJob(job);
        results.push({ id: job.id, status: "FAILED", error: job.lastError });
      }
    }
    return results;
  }

  async listJobStatus(tenantId: string) {
    return this.repo.listJobs({ tenantId });
  }
}

export type { KnowledgeChunk } from "./types";
