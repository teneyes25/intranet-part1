import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { userContextFromSession } from "./auth-context";
import { applyKnowledgeMigration, pgliteExecutor } from "./pglite-executor";
import { SqlKnowledgeRepository, type SqlExecutor } from "./repository";
import { KnowledgeService } from "./service";
import { LocalFsStorageAdapter } from "./storage";
import { sha256 } from "./hash";

const serviceCtx = { kind: "sync-service" as const, tenantId: "fm" };
const sales = {
  kind: "user" as const,
  tenantId: "fm",
  userId: "u-sales",
  active: true,
  groups: ["sales"],
};

async function createHarness(opts?: {
  now?: () => number;
  limits?: { maxAttempts?: number; maxChunks?: number; maxSearchHits?: number; maxHitChars?: number };
  retryDelayMs?: (attempts: number) => number;
  extractor?: (bytes: Buffer) => string;
  beforeIndexPublish?: () => Promise<void>;
}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-"));
  const db = new PGlite();
  await applyKnowledgeMigration(db);
  const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
  const storage = new LocalFsStorageAdapter(path.join(dir, "objects"));
  const service = new KnowledgeService(repo, storage, {
    now: opts?.now ?? (() => Date.now()),
    aclTtlMs: 300_000,
    limits: opts?.limits,
    retryDelayMs: opts?.retryDelayMs,
    extractor: opts?.extractor,
    beforeIndexPublish: opts?.beforeIndexPublish,
  });
  return { service, db, repo, storage, dir };
}

async function closeHarness(h: { dir: string; db: PGlite }) {
  await h.db.close();
  await rm(h.dir, { recursive: true, force: true });
}

function bytesOf(text: string) {
  const bytes = Buffer.from(text);
  return { bytes, hash: sha256(bytes) };
}

async function filesUnder(root: string) {
  const out: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(full);
    }
  }
  await walk(root);
  return out;
}

function rejectVersionInserts(inner: SqlExecutor): SqlExecutor {
  const wrap = (base: SqlExecutor): SqlExecutor => ({
    query: (sql, params) => base.query(sql, params),
    execute(sql, params) {
      if (sql.includes('INSERT INTO "knowledge_document_versions"')) {
        throw new Error("db write failed");
      }
      return base.execute(sql, params);
    },
    transaction(fn) {
      return base.transaction((tx) => fn(wrap(tx)));
    },
  });
  return wrap(inner);
}

async function approveText(h: Awaited<ReturnType<typeof createHarness>>, text = "양모 가격 100원") {
  const { bytes, hash } = bytesOf(text);
  const version = await h.service.upload(serviceCtx, {
    documentId: "doc",
    title: "상품",
    bytes,
    expectedHash: hash,
    mimeType: "text/plain",
  });
  await h.service.applyEvent(serviceCtx, {
    eventId: "e1",
    documentId: "doc",
    sequence: 1,
    type: "APPROVE",
    versionId: version.versionId,
    allowedGroups: ["sales"],
  });
  return version;
}

test("regression: revoke committed before publish is not overwritten", async () => {
  const h = await createHarness({
    beforeIndexPublish: async () => {
      await h.service.applyEvent(serviceCtx, {
        eventId: "e2",
        documentId: "doc",
        sequence: 2,
        type: "REVOKE",
      });
    },
  });
  try {
    const version = await approveText(h);
    await assert.rejects(() =>
      h.service.indexApprovedText(serviceCtx, {
        documentId: "doc",
        versionId: version.versionId,
      }),
    );
    const doc = await h.repo.getDoc("fm", "doc");
    assert.equal(doc?.revoked, true);
    assert.equal(doc?.activeVersionId, null);
    assert.equal(doc?.approvedVersionId, null);
    assert.deepEqual(await h.service.search(sales, "양모"), []);
  } finally {
    await closeHarness(h);
  }
});

test("regression: ACL change committed before publish is kept", async () => {
  const h = await createHarness({
    beforeIndexPublish: async () => {
      await h.service.applyEvent(serviceCtx, {
        eventId: "e2",
        documentId: "doc",
        sequence: 2,
        type: "ACL",
        allowedGroups: ["design"],
      });
    },
  });
  try {
    const version = await approveText(h);
    await h.service.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: version.versionId,
    });
    const doc = await h.repo.getDoc("fm", "doc");
    assert.equal(doc?.aclRevision, 2);
    assert.equal(doc?.activeVersionId, version.versionId);
    assert.deepEqual(await h.service.search(sales, "양모"), []);
    assert.equal(
      (await h.service.search({ ...sales, groups: ["design"] }, "양모")).length,
      1,
    );
  } finally {
    await closeHarness(h);
  }
});

test("regression: stale document revision cannot restore a revoked row", async () => {
  const h = await createHarness();
  try {
    const version = await approveText(h);
    await h.service.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: version.versionId,
    });
    const before = await h.repo.getDoc("fm", "doc");
    await h.service.applyEvent(serviceCtx, {
      eventId: "e2",
      documentId: "doc",
      sequence: 2,
      type: "REVOKE",
    });
    const patched = await h.repo.patchDoc("fm", "doc", before!.stateRevision, {
      revoked: false,
      approvedVersionId: version.versionId,
      activeVersionId: version.versionId,
      processingStatus: "READY",
    });
    assert.equal(patched, null);
    const after = await h.repo.getDoc("fm", "doc");
    assert.equal(after?.revoked, true);
    assert.equal(after?.activeVersionId, null);
    assert.equal(after?.approvedVersionId, null);
  } finally {
    await closeHarness(h);
  }
});

test("regression: upload does not overwrite ready or revoked document state", async () => {
  const h = await createHarness();
  try {
    const version = await approveText(h);
    await h.service.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: version.versionId,
    });
    const next = bytesOf("양모 가격 200원");
    await h.service.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes: next.bytes,
      expectedHash: next.hash,
      mimeType: "text/plain",
    });
    const doc = await h.repo.getDoc("fm", "doc");
    assert.equal(doc?.processingStatus, "READY");
    assert.equal(doc?.activeVersionId, version.versionId);
    assert.equal(doc?.approvedVersionId, version.versionId);
  } finally {
    await closeHarness(h);
  }
});

test("regression: database failure after upload deletes orphan originals", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-"));
  const db = new PGlite();
  await applyKnowledgeMigration(db);
  const storage = new LocalFsStorageAdapter(path.join(dir, "objects"));
  const repo = new SqlKnowledgeRepository(rejectVersionInserts(pgliteExecutor(db)));
  const service = new KnowledgeService(repo, storage);
  try {
    const { bytes, hash } = bytesOf("양모");
    await assert.rejects(() =>
      service.upload(serviceCtx, {
        documentId: "doc",
        title: "상품",
        bytes,
        expectedHash: hash,
        mimeType: "text/plain",
        previewBytes: Buffer.from("preview"),
      }),
    );
    assert.deepEqual(await filesUnder(path.join(dir, "objects")), []);
    assert.deepEqual(await repo.listDocumentIds("fm"), []);
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("regression: file, chunk, and search result limits", async () => {
  const h = await createHarness({
    limits: { maxChunks: 1, maxSearchHits: 1, maxHitChars: 4 },
  });
  try {
    const tooBig = Buffer.alloc(1_048_577, 97);
    await assert.rejects(() =>
      h.service.upload(serviceCtx, {
        documentId: "big",
        title: "큰파일",
        bytes: tooBig,
        expectedHash: sha256(tooBig),
        mimeType: "text/plain",
      }),
    );
    assert.deepEqual(await h.repo.listDocumentIds("fm"), []);
    const { bytes, hash } = bytesOf("양모 하나\n\n양모 둘");
    const version = await h.service.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.service.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: version.versionId,
      allowedGroups: ["sales"],
    });
    await assert.rejects(() =>
      h.service.indexApprovedText(serviceCtx, {
        documentId: "doc",
        versionId: version.versionId,
      }),
    );
    assert.equal((await h.repo.getDoc("fm", "doc"))?.activeVersionId, null);
    const one = bytesOf("양모가격표");
    const single = await h.service.upload(serviceCtx, {
      documentId: "short",
      title: "짧은",
      bytes: one.bytes,
      expectedHash: one.hash,
      mimeType: "text/plain",
    });
    await h.service.applyEvent(serviceCtx, {
      eventId: "e-short",
      documentId: "short",
      sequence: 1,
      type: "APPROVE",
      versionId: single.versionId,
      allowedGroups: ["sales"],
    });
    await h.service.indexApprovedText(serviceCtx, {
      documentId: "short",
      versionId: single.versionId,
    });
    const hits = await h.service.search(sales, "양모");
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.content.length, 4);
  } finally {
    await closeHarness(h);
  }
});

test("regression: index jobs stay bound to their event version", async () => {
  const h = await createHarness();
  try {
    const first = bytesOf("양모 가격 100원");
    const v1 = await h.service.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes: first.bytes,
      expectedHash: first.hash,
      mimeType: "text/plain",
    });
    await h.service.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v1.versionId,
      allowedGroups: ["sales"],
    });
    const second = bytesOf("양모 가격 200원");
    const v2 = await h.service.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes: second.bytes,
      expectedHash: second.hash,
      mimeType: "text/plain",
    });
    await h.service.applyEvent(serviceCtx, {
      eventId: "e2",
      documentId: "doc",
      sequence: 2,
      type: "APPROVE",
      versionId: v2.versionId,
      allowedGroups: ["sales"],
    });
    const results = await h.service.processJobs(serviceCtx);
    const jobs = await h.repo.listJobs({ tenantId: "fm" });
    const oldJob = jobs.find((job) => job.versionId === v1.versionId);
    const newJob = jobs.find((job) => job.versionId === v2.versionId);
    assert.equal(oldJob?.status, "SUPERSEDED");
    assert.equal(oldJob?.lastError, "version replaced");
    assert.equal(newJob?.status, "DONE");
    assert.equal(results.filter((item) => item.status === "DONE").length, 1);
    assert.equal((await h.service.search(sales, "양모"))[0]?.versionId, v2.versionId);
    await assert.rejects(() => h.service.download(sales, "doc", v1.versionId));
  } finally {
    await closeHarness(h);
  }
});

test("regression: failed jobs wait for nextRetryAt then become exhausted", async () => {
  const clock = { now: 10_000 };
  const h = await createHarness({
    now: () => clock.now,
    limits: { maxAttempts: 2 },
    retryDelayMs: () => 5_000,
    extractor: () => {
      throw new Error("extractor down");
    },
  });
  try {
    await approveText(h);
    const first = await h.service.processJobs(serviceCtx);
    assert.equal(first[0]?.status, "FAILED");
    const waiting = await h.repo.listJobs({ tenantId: "fm" });
    assert.equal(waiting[0]?.nextRetryAt?.getTime(), 15_000);
    clock.now = 14_000;
    assert.deepEqual(await h.service.processJobs(serviceCtx), []);
    clock.now = 15_000;
    const second = await h.service.processJobs(serviceCtx);
    assert.equal(second[0]?.status, "EXHAUSTED");
    assert.deepEqual(await h.service.processJobs(serviceCtx), []);
    assert.equal((await h.service.search(sales, "양모")).length, 0);
  } finally {
    await closeHarness(h);
  }
});

test("regression: a second worker cannot claim a leased job", async () => {
  const h = await createHarness();
  try {
    await approveText(h);
    const now = new Date();
    const until = new Date(now.getTime() + 60_000);
    const first = await h.repo.claimNextJob("fm", "worker-a", "fence-a", now, until);
    const second = await h.repo.claimNextJob("fm", "worker-b", "fence-b", now, until);
    assert.ok(first);
    assert.equal(second, null);
    assert.equal(first?.leaseOwner, "worker-a");
    const lost = await h.repo.finishJob(
      {
        jobId: first!.id,
        tenantId: first!.tenantId,
        leaseOwner: "worker-b",
        leaseFence: first!.leaseFence ?? "",
        leaseUntil: until,
      },
      now,
      {
        status: "DONE",
        attempts: first!.attempts,
        nextRetryAt: null,
        lastError: null,
        completedAt: now,
      },
    );
    assert.equal(lost, false);
    assert.equal((await h.repo.listJobs({ tenantId: "fm" }))[0]?.status, "PROCESSING");
    const expired = await h.repo.finishJob(
      {
        jobId: first!.id,
        tenantId: first!.tenantId,
        leaseOwner: "worker-a",
        leaseFence: first!.leaseFence ?? "",
        leaseUntil: until,
      },
      new Date(until.getTime() + 1_000),
      {
        status: "DONE",
        attempts: first!.attempts,
        nextRetryAt: null,
        lastError: null,
        completedAt: now,
      },
    );
    assert.equal(expired, false);
    assert.equal((await h.repo.listJobs({ tenantId: "fm" }))[0]?.status, "PROCESSING");
  } finally {
    await closeHarness(h);
  }
});

test("regression: worker resumed after lease loss cannot publish or finish", async () => {
  const h = await createHarness();
  const workerB = new KnowledgeService(h.repo, h.storage);
  const published = {
    chunks: "",
    generation: 0,
    docStatus: "",
    activeVersionId: null as string | null,
    jobStatus: "",
    jobError: null as string | null,
    seen: false,
  };
  const workerA = new KnowledgeService(h.repo, h.storage, {
    beforeIndexPublish: async () => {
      const owned = (await h.repo.listJobs({ tenantId: "fm" })).find(
        (job) => job.status === "PROCESSING",
      );
      assert.ok(owned);
      owned.leaseUntil = new Date(Date.now() - 1_000);
      await h.repo.saveJob(owned);
      await workerB.recoverExpiredJobs(serviceCtx);
      await workerB.processJobs(serviceCtx);
      const versionId = owned.versionId ?? "";
      const version = await h.repo.getVersion("fm", "doc", versionId);
      const doc = await h.repo.getDoc("fm", "doc");
      const job = (await h.repo.listJobs({ tenantId: "fm" }))[0];
      published.chunks = JSON.stringify(version?.chunks ?? null);
      published.generation = version?.indexGeneration ?? -1;
      published.docStatus = doc?.processingStatus ?? "";
      published.activeVersionId = doc?.activeVersionId ?? null;
      published.jobStatus = job?.status ?? "";
      published.jobError = job?.lastError ?? null;
      published.seen = true;
    },
  });
  try {
    const version = await approveText({ ...h, service: workerA });
    const results = await workerA.processJobs(serviceCtx);
    assert.equal(results[0]?.status, "LOST_LEASE");
    assert.equal(published.seen, true);
    assert.equal(published.generation, 1);
    assert.equal(published.jobStatus, "DONE");
    assert.equal(published.activeVersionId, version.versionId);
    const afterVersion = await h.repo.getVersion("fm", "doc", version.versionId);
    const afterDoc = await h.repo.getDoc("fm", "doc");
    const afterJob = (await h.repo.listJobs({ tenantId: "fm" }))[0];
    assert.equal(JSON.stringify(afterVersion?.chunks ?? null), published.chunks);
    assert.equal(afterVersion?.indexGeneration, published.generation);
    assert.equal(afterVersion?.status, "READY");
    assert.equal(afterDoc?.processingStatus, published.docStatus);
    assert.equal(afterDoc?.activeVersionId, published.activeVersionId);
    assert.equal(afterJob?.status, "DONE");
    assert.equal(afterJob?.lastError, published.jobError);
  } finally {
    await closeHarness(h);
  }
});

test("regression: crash on the last attempt expires to EXHAUSTED", async () => {
  const h = await createHarness({ limits: { maxAttempts: 1 } });
  try {
    await approveText(h);
    const now = new Date();
    const claimed = await h.repo.claimNextJob(
      "fm",
      "dead-worker",
      "fence-dead",
      now,
      new Date(now.getTime() - 1_000),
    );
    assert.equal(claimed?.attempts, 1);
    assert.equal(claimed?.status, "PROCESSING");
    const recovered = await h.service.recoverExpiredJobs(serviceCtx);
    assert.equal(recovered.exhausted, 1);
    assert.equal(recovered.pending, 0);
    const job = (await h.repo.listJobs({ tenantId: "fm" }))[0];
    assert.equal(job?.status, "EXHAUSTED");
    assert.equal(job?.leaseOwner, null);
    assert.deepEqual(await h.service.processJobs(serviceCtx), []);
    assert.equal((await h.repo.listJobs({ tenantId: "fm" }))[0]?.status, "EXHAUSTED");
  } finally {
    await closeHarness(h);
  }
});

test("regression: assigned staff group is required for search", async () => {
  const h = await createHarness();
  try {
    const version = await approveText(h);
    await h.service.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: version.versionId,
    });
    await h.service.assignStaffGroups(serviceCtx, "staff-1", ["design"]);
    const deniedSession = userContextFromSession({
      id: "staff-1",
      isActive: true,
      approvalStatus: "APPROVED",
      groups: await h.service.listStaffGroups("fm", "staff-1"),
    });
    assert.deepEqual(deniedSession.groups, ["design"]);
    assert.deepEqual(
      await h.service.search({ ...deniedSession, tenantId: "fm" }, "양모"),
      [],
    );
    await h.service.assignStaffGroups(serviceCtx, "staff-1", ["sales"]);
    const allowedSession = userContextFromSession({
      id: "staff-1",
      isActive: true,
      approvalStatus: "APPROVED",
      groups: await h.service.listStaffGroups("fm", "staff-1"),
    });
    assert.deepEqual(allowedSession.groups, ["sales"]);
    assert.equal(
      (await h.service.search({ ...allowedSession, tenantId: "fm" }, "양모")).length,
      1,
    );
  } finally {
    await closeHarness(h);
  }
});

test("restart: child process reopens file PGlite and reclaims only expired leases", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-file-"));
  const dataDir = path.join(dir, "pgdata");
  const db = new PGlite(dataDir);
  await applyKnowledgeMigration(db);
  const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
  const storage = new LocalFsStorageAdapter(path.join(dir, "objects"));
  const service = new KnowledgeService(repo, storage);
  try {
    const { bytes, hash } = bytesOf("양모 복구 문서");
    for (const tenant of ["fm", "other"]) {
      const ctx = { kind: "sync-service" as const, tenantId: tenant };
      const version = await service.upload(ctx, {
        documentId: tenant === "fm" ? "expired" : "doc",
        title: "상품",
        bytes,
        expectedHash: hash,
        mimeType: "text/plain",
      });
      await service.applyEvent(ctx, {
        eventId: "e1",
        documentId: tenant === "fm" ? "expired" : "doc",
        sequence: 1,
        type: "APPROVE",
        versionId: version.versionId,
        allowedGroups: ["sales"],
      });
    }
    const live = await service.upload(serviceCtx, {
      documentId: "live",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await service.applyEvent(serviceCtx, {
      eventId: "e-live",
      documentId: "live",
      sequence: 1,
      type: "APPROVE",
      versionId: live.versionId,
      allowedGroups: ["sales"],
    });
    const now = Date.now();
    for (const job of await repo.listJobs()) {
      job.status = "PROCESSING";
      job.leaseUntil =
        job.tenantId === "fm" && job.documentId === "expired"
          ? new Date(now - 5_000)
          : new Date(now + 60_000);
      await repo.saveJob(job);
    }
    await db.close();

    const probe = spawnSync(
      process.execPath,
      ["--import", "tsx", "src/lib/knowledge/restart-probe.ts", dataDir, "fm"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
    const line = probe.stdout.split("\n").find((item) => item.startsWith("RESULT "));
    assert.ok(line);
    const parsed = JSON.parse(line.slice("RESULT ".length)) as {
      reclaimed: { pending: number; exhausted: number };
      jobs: { tenantId: string; documentId: string; status: string }[];
    };
    assert.equal(parsed.reclaimed.pending, 1);
    assert.equal(parsed.reclaimed.exhausted, 0);
    assert.equal(
      parsed.jobs.find((job) => job.documentId === "expired")?.status,
      "PENDING",
    );
    assert.equal(
      parsed.jobs.find((job) => job.documentId === "live")?.status,
      "PROCESSING",
    );
    assert.equal(
      parsed.jobs.find((job) => job.tenantId === "other")?.status,
      "PROCESSING",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
