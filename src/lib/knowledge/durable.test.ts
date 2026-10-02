import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { applyKnowledgeMigration, pgliteExecutor } from "./pglite-executor";
import { SqlKnowledgeRepository } from "./repository";
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

async function createHarness(clock?: { now: number }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-"));
  const db = new PGlite();
  await applyKnowledgeMigration(db);
  const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
  const storage = new LocalFsStorageAdapter(path.join(dir, "objects"));
  const k = new KnowledgeService(repo, storage, {
    now: () => clock?.now ?? Date.now(),
    aclTtlMs: 300_000,
  });
  return { k, db, repo, storage, dir, clock };
}

async function closeHarness(h: { dir: string; db: PGlite }) {
  await h.db.close();
  await rm(h.dir, { recursive: true, force: true });
}

function bytesOf(text: string) {
  const bytes = Buffer.from(text);
  return { bytes, hash: sha256(bytes) };
}

test("durable: draft excluded; approved indexed original hash matches", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모 가격 100원");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    assert.deepEqual(await h.k.search(sales, "양모"), []);
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v.versionId,
      allowedGroups: ["sales"],
    });
    assert.deepEqual(await h.k.search(sales, "양모"), []);
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v.versionId,
    });
    const hits = await h.k.search(sales, "양모");
    assert.equal(hits[0]?.versionId, v.versionId);
    assert.equal(sha256(await h.k.download(sales, "doc", v.versionId)), hash);
  } finally {
    await closeHarness(h);
  }
});

test("durable: department, tenant, inactive and service denied", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모 가격 100원");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v.versionId,
      allowedGroups: ["sales"],
    });
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v.versionId,
    });
    for (const ctx of [
      { ...sales, groups: ["design"] },
      { ...sales, tenantId: "other" },
    ]) {
      assert.deepEqual(await h.k.search(ctx, "양모"), []);
      await assert.rejects(() => h.k.download(ctx, "doc", v.versionId));
    }
    await assert.rejects(() =>
      h.k.search({ ...sales, active: false }, "양모"),
    );
    await assert.rejects(() => h.k.search(serviceCtx, "양모"));
  } finally {
    await closeHarness(h);
  }
});

test("durable: hash mismatch does not persist a document", async () => {
  const h = await createHarness();
  try {
    await assert.rejects(() =>
      h.k.upload(serviceCtx, {
        documentId: "doc",
        title: "x",
        bytes: Buffer.from("a"),
        expectedHash: "bad",
        mimeType: "text/plain",
      }),
    );
    assert.deepEqual(await h.repo.listDocumentIds("fm"), []);
  } finally {
    await closeHarness(h);
  }
});

test("durable: duplicate event idempotent; changed/gap/stale rejected", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    const ev = {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE" as const,
      versionId: v.versionId,
      allowedGroups: ["sales"],
    };
    assert.equal((await h.k.applyEvent(serviceCtx, ev)).duplicate, false);
    assert.equal((await h.k.applyEvent(serviceCtx, ev)).duplicate, true);
    await assert.rejects(() =>
      h.k.applyEvent(serviceCtx, { ...ev, type: "REVOKE" }),
    );
    await assert.rejects(() =>
      h.k.applyEvent(serviceCtx, {
        eventId: "e3",
        documentId: "doc",
        sequence: 3,
        type: "REVOKE",
      }),
    );
    await assert.rejects(() =>
      h.k.applyEvent(serviceCtx, {
        eventId: "e0",
        documentId: "doc",
        sequence: 0,
        type: "REVOKE",
      }),
    );
  } finally {
    await closeHarness(h);
  }
});

test("durable: failed v2 keeps v1; success switches and blocks old download", async () => {
  const h = await createHarness();
  try {
    const a = bytesOf("양모 가격 100원");
    const v1 = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes: a.bytes,
      expectedHash: a.hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v1.versionId,
      allowedGroups: ["sales"],
    });
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v1.versionId,
    });
    const b = bytesOf("양모 가격 200원");
    const v2 = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes: b.bytes,
      expectedHash: b.hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e2",
      documentId: "doc",
      sequence: 2,
      type: "APPROVE",
      versionId: v2.versionId,
      allowedGroups: ["sales"],
    });
    await assert.rejects(() =>
      h.k.indexApprovedText(serviceCtx, {
        documentId: "doc",
        versionId: v2.versionId,
        extractor: () => {
          throw new Error("failure");
        },
      }),
    );
    assert.equal((await h.k.search(sales, "양모"))[0]?.versionId, v1.versionId);
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v2.versionId,
    });
    assert.equal((await h.k.search(sales, "양모"))[0]?.versionId, v2.versionId);
    await assert.rejects(() => h.k.download(sales, "doc", v1.versionId));
  } finally {
    await closeHarness(h);
  }
});

test("durable: revoke blocks search, download and late reindex", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모 가격 100원");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v.versionId,
      allowedGroups: ["sales"],
    });
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v.versionId,
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e2",
      documentId: "doc",
      sequence: 2,
      type: "REVOKE",
    });
    assert.deepEqual(await h.k.search(sales, "양모"), []);
    await assert.rejects(() => h.k.download(sales, "doc", v.versionId));
    await assert.rejects(() =>
      h.k.indexApprovedText(serviceCtx, {
        documentId: "doc",
        versionId: v.versionId,
      }),
    );
  } finally {
    await closeHarness(h);
  }
});

test("durable: ACL TTL fail-closed then refresh restores group", async () => {
  const clock = { now: 1_000 };
  const h = await createHarness(clock);
  try {
    const { bytes, hash } = bytesOf("양모 가격 100원");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v.versionId,
      allowedGroups: ["sales"],
    });
    await h.k.indexApprovedText(serviceCtx, {
      documentId: "doc",
      versionId: v.versionId,
    });
    clock.now = 1_000 + 300_000;
    assert.deepEqual(await h.k.search(sales, "양모"), []);
    await h.k.applyEvent(serviceCtx, {
      eventId: "e2",
      documentId: "doc",
      sequence: 2,
      type: "ACL",
      allowedGroups: ["design"],
    });
    assert.deepEqual(await h.k.search(sales, "양모"), []);
    assert.equal(
      (
        await h.k.search({ ...sales, groups: ["design"] }, "양모")
      ).length,
      1,
    );
  } finally {
    await closeHarness(h);
  }
});

test("same-process: expired lease is reclaimed for one tenant only", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모 복구 문서");
    const v = await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(serviceCtx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: v.versionId,
      allowedGroups: ["sales"],
    });
    const other = { kind: "sync-service" as const, tenantId: "other" };
    const otherVersion = await h.k.upload(other, {
      documentId: "doc",
      title: "다른회사",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await h.k.applyEvent(other, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: otherVersion.versionId,
      allowedGroups: ["sales"],
    });
    const now = Date.now();
    const fmJobs = await h.repo.listJobs({ tenantId: "fm", status: "PENDING" });
    const otherJobs = await h.repo.listJobs({ tenantId: "other", status: "PENDING" });
    fmJobs[0]!.status = "PROCESSING";
    fmJobs[0]!.leaseUntil = new Date(now - 1_000);
    await h.repo.saveJob(fmJobs[0]!);
    otherJobs[0]!.status = "PROCESSING";
    otherJobs[0]!.leaseUntil = new Date(now + 60_000);
    await h.repo.saveJob(otherJobs[0]!);

    const recovered = await h.k.recoverExpiredJobs(serviceCtx);
    assert.equal(recovered.pending, 1);
    assert.equal(recovered.exhausted, 0);
    assert.equal(
      (await h.repo.listJobs({ tenantId: "other" }))[0]?.status,
      "PROCESSING",
    );
    const processed = await h.k.processJobs(serviceCtx);
    assert.equal(processed[0]?.status, "DONE");
    assert.equal((await h.k.search(sales, "복구"))[0]?.versionId, v.versionId);
    const versions = await h.db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "knowledge_document_versions" WHERE "tenantId"='fm'`,
    );
    assert.equal(versions.rows[0]?.n, 1);
  } finally {
    await closeHarness(h);
  }
});

test("regression: other tenant versionId cannot approve the same documentId", async () => {
  const h = await createHarness();
  try {
    const { bytes, hash } = bytesOf("양모 가격 100원");
    const other = { kind: "sync-service" as const, tenantId: "other" };
    await h.k.upload(serviceCtx, {
      documentId: "doc",
      title: "본사",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    const foreign = await h.k.upload(other, {
      documentId: "doc",
      title: "다른회사",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await assert.rejects(() =>
      h.k.applyEvent(serviceCtx, {
        eventId: "e1",
        documentId: "doc",
        sequence: 1,
        type: "APPROVE",
        versionId: foreign.versionId,
        allowedGroups: ["sales"],
      }),
    );
    const doc = await h.repo.getDoc("fm", "doc");
    assert.equal(doc?.approvedVersionId, null);
    assert.equal(doc?.sequence, 0);
    assert.equal(await h.repo.getVersion("fm", "doc", foreign.versionId), null);
    assert.equal(
      (await h.repo.getVersion("other", "doc", foreign.versionId))?.tenantId,
      "other",
    );
  } finally {
    await closeHarness(h);
  }
});
