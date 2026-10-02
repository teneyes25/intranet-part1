import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Pool } from "pg";

import { pgPoolExecutor } from "./pg-executor";
import { SqlKnowledgeRepository } from "./repository";
import { KnowledgeService } from "./service";
import { LocalFsStorageAdapter } from "./storage";
import { sha256 } from "./hash";

function localTestUrl() {
  const url = process.env.KNOWLEDGE_TEST_DATABASE_URL;
  if (!url) return null;
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  const socketHost = new URL(url).searchParams.get("host") ?? "";
  const localSocket =
    socketHost.startsWith("/var/run/postgresql") || socketHost.startsWith("/tmp/");
  if (hostname !== "127.0.0.1" && hostname !== "localhost" && !localSocket) return null;
  return url;
}

test("postgres: independent connections reject a stale revision and double-claim", async (t) => {
  const url = localTestUrl();
  if (!url) {
    t.skip("local development PostgreSQL was not available");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 4 });
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-pg-"));
  try {
    await pool.query(`
      DROP TABLE IF EXISTS "knowledge_sync_jobs", "knowledge_sync_events",
        "knowledge_document_acls", "knowledge_document_versions",
        "knowledge_staff_groups", "knowledge_documents" CASCADE
    `);
    const migration = await readFile(
      path.join(process.cwd(), "prisma/migrations/20261002120000_knowledge_v1/migration.sql"),
      "utf8",
    );
    await pool.query(migration);
    const repo = new SqlKnowledgeRepository(pgPoolExecutor(pool));
    const storage = new LocalFsStorageAdapter(dir);
    const service = new KnowledgeService(repo, storage);
    const ctx = { kind: "sync-service" as const, tenantId: "fm" };
    const sales = {
      kind: "user" as const,
      tenantId: "fm",
      userId: "u",
      active: true,
      groups: ["sales"],
    };
    const bytes = Buffer.from("양모 가격 100원");
    const hash = sha256(bytes);

    const revokeService = new KnowledgeService(repo, storage, {
      beforeIndexPublish: async () => {
        await revokeService.applyEvent(ctx, {
          eventId: "revoke-2",
          documentId: "revoke-doc",
          sequence: 2,
          type: "REVOKE",
        });
      },
    });
    const revokeVersion = await revokeService.upload(ctx, {
      documentId: "revoke-doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await revokeService.applyEvent(ctx, {
      eventId: "revoke-1",
      documentId: "revoke-doc",
      sequence: 1,
      type: "APPROVE",
      versionId: revokeVersion.versionId,
      allowedGroups: ["sales"],
    });
    await assert.rejects(() =>
      revokeService.indexApprovedText(ctx, {
        documentId: "revoke-doc",
        versionId: revokeVersion.versionId,
      }),
    );
    const revoked = await repo.getDoc("fm", "revoke-doc");
    assert.equal(revoked?.revoked, true);
    assert.equal(revoked?.activeVersionId, null);

    const aclService = new KnowledgeService(repo, storage, {
      beforeIndexPublish: async () => {
        await aclService.applyEvent(ctx, {
          eventId: "acl-2",
          documentId: "acl-doc",
          sequence: 2,
          type: "ACL",
          allowedGroups: ["design"],
        });
      },
    });
    const aclVersion = await aclService.upload(ctx, {
      documentId: "acl-doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await aclService.applyEvent(ctx, {
      eventId: "acl-1",
      documentId: "acl-doc",
      sequence: 1,
      type: "APPROVE",
      versionId: aclVersion.versionId,
      allowedGroups: ["sales"],
    });
    await aclService.indexApprovedText(ctx, {
      documentId: "acl-doc",
      versionId: aclVersion.versionId,
    });
    const aclDoc = await repo.getDoc("fm", "acl-doc");
    assert.equal(aclDoc?.aclRevision, 2);
    assert.equal(aclDoc?.activeVersionId, aclVersion.versionId);
    assert.equal((await aclService.search(sales, "양모")).length, 0);
    assert.equal(
      (await aclService.search({ ...sales, groups: ["design"] }, "양모")).length,
      1,
    );

    const version = await service.upload(ctx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
    });
    await service.applyEvent(ctx, {
      eventId: "e1",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE",
      versionId: version.versionId,
      allowedGroups: ["sales"],
    });

    const writer = await pool.connect();
    const other = await pool.connect();
    try {
      await writer.query("BEGIN");
      const seen = await writer.query(
        `SELECT "stateRevision" FROM "knowledge_documents" WHERE "tenantId"=$1 AND "id"=$2`,
        ["fm", "doc"],
      );
      const revision = Number(seen.rows[0]?.stateRevision);
      await other.query("BEGIN");
      await other.query(
        `UPDATE "knowledge_documents"
         SET "revoked"=true, "approvedVersionId"=NULL, "activeVersionId"=NULL,
             "stateRevision"="stateRevision"+1
         WHERE "tenantId"=$1 AND "id"=$2`,
        ["fm", "doc"],
      );
      await other.query("COMMIT");
      const stale = await writer.query(
        `UPDATE "knowledge_documents"
         SET "revoked"=false, "activeVersionId"=$3, "stateRevision"="stateRevision"+1
         WHERE "tenantId"=$1 AND "id"=$2 AND "stateRevision"=$4
         RETURNING "id"`,
        ["fm", "doc", version.versionId, revision],
      );
      assert.equal(stale.rowCount, 0);
      await writer.query("ROLLBACK");
    } finally {
      writer.release();
      other.release();
    }

    const doc = await repo.getDoc("fm", "doc");
    assert.equal(doc?.revoked, true);
    assert.equal(doc?.activeVersionId, null);

    await pool.query(
      `DELETE FROM "knowledge_sync_jobs" WHERE "tenantId"=$1 AND "documentId"<>$2`,
      ["fm", "doc"],
    );
    const pending = await repo.listJobs({ tenantId: "fm", status: "PENDING" });
    assert.equal(pending.length, 1);
    const now = new Date();
    const until = new Date(now.getTime() + 60_000);
    const claimed = await Promise.all([
      repo.claimNextJob("fm", "worker-a", now, until),
      repo.claimNextJob("fm", "worker-b", now, until),
    ]);
    assert.equal(claimed.filter(Boolean).length, 1);
  } finally {
    await pool.end();
    await rm(dir, { recursive: true, force: true });
  }
});
