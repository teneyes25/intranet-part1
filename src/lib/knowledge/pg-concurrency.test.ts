import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Client, Pool } from "pg";

import { sha256 } from "./hash";
import { pgPoolExecutor } from "./pg-executor";
import { SqlKnowledgeRepository } from "./repository";
import { KnowledgeService } from "./service";
import { LocalFsStorageAdapter } from "./storage";

const PUBLIC_TABLES = [
  "knowledge_documents",
  "knowledge_document_versions",
  "knowledge_document_acls",
  "knowledge_sync_events",
  "knowledge_sync_jobs",
  "knowledge_staff_groups",
] as const;

function localTestUrl() {
  const url = process.env.KNOWLEDGE_TEST_DATABASE_URL;
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const socketHost = parsed.searchParams.get("host") ?? "";
  const localSocket =
    socketHost.startsWith("/var/run/postgresql") || socketHost.startsWith("/tmp/");
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost" && !localSocket) {
    return null;
  }
  return url;
}

async function ensurePublicMarkers(client: Client) {
  for (const table of PUBLIC_TABLES) {
    const found = await client.query<{ name: string | null }>(
      "SELECT to_regclass($1) AS name",
      [`public.${table}`],
    );
    if (found.rows[0]?.name) continue;
    await client.query(
      `CREATE TABLE public."${table}" (id text PRIMARY KEY, marker text NOT NULL)`,
    );
    await client.query(`INSERT INTO public."${table}" (id, marker) VALUES ($1, $2)`, [
      table,
      "public-keep",
    ]);
  }
}

async function snapshotPublic(client: Client) {
  const snapshot: Record<string, unknown[]> = {};
  for (const table of PUBLIC_TABLES) {
    const rows = await client.query(`SELECT * FROM public."${table}" ORDER BY id`);
    snapshot[table] = rows.rows;
  }
  return snapshot;
}

async function withLocalPostgres(
  t: test.TestContext,
  fn: (env: {
    pool: Pool;
    repo: SqlKnowledgeRepository;
    storage: LocalFsStorageAdapter;
  }) => Promise<void>,
) {
  const url = localTestUrl();
  if (!url) {
    t.skip("local development PostgreSQL was not available");
    return;
  }
  const schema = `kt_${randomBytes(8).toString("hex")}`;
  const admin = new Client({ connectionString: url });
  await admin.connect();
  await ensurePublicMarkers(admin);
  const before = await snapshotPublic(admin);
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();

  const pool = new Pool({
    connectionString: url,
    max: 4,
    options: `-c search_path=${schema}`,
  });
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-v1-pg-"));
  try {
    const migration = await readFile(
      path.join(process.cwd(), "prisma/migrations/20261002120000_knowledge_v1/migration.sql"),
      "utf8",
    );
    await pool.query(migration);
    const pathRow = await pool.query<{ search_path: string }>("SHOW search_path");
    assert.equal(pathRow.rows[0]?.search_path.replaceAll('"', ""), schema);
    const repo = new SqlKnowledgeRepository(pgPoolExecutor(pool));
    const storage = new LocalFsStorageAdapter(dir);
    await fn({ pool, repo, storage });
  } finally {
    await pool.end();
    await rm(dir, { recursive: true, force: true });
    const cleanup = new Client({ connectionString: url });
    await cleanup.connect();
    await cleanup.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    const after = await snapshotPublic(cleanup);
    assert.deepEqual(after, before);
    await cleanup.end();
  }
}

test("postgres: isolated schema keeps a stale revision from restoring a revoked document", async (t) => {
  await withLocalPostgres(t, async ({ pool, repo, storage }) => {
    const service = new KnowledgeService(repo, storage);
    const ctx = { kind: "sync-service" as const, tenantId: "fm" };
    const bytes = Buffer.from("양모 가격 100원");
    const version = await service.upload(ctx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: sha256(bytes),
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
      const seen = await writer.query<{ stateRevision: number }>(
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
    const now = new Date();
    const until = new Date(now.getTime() + 60_000);
    const claimed = await Promise.all([
      repo.claimNextJob("fm", "worker-a", "fence-a", now, until),
      repo.claimNextJob("fm", "worker-b", "fence-b", now, until),
    ]);
    assert.equal(claimed.filter(Boolean).length, 1);
  });
});

test("postgres: revoke and ACL commits win over a later index publish", async (t) => {
  await withLocalPostgres(t, async ({ repo, storage }) => {
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
  });
});

test("postgres: one concurrent duplicate event applies and a changed copy is rejected", async (t) => {
  await withLocalPostgres(t, async ({ pool, repo, storage }) => {
    const service = new KnowledgeService(repo, storage);
    const ctx = { kind: "sync-service" as const, tenantId: "fm" };
    const bytes = Buffer.from("양모 가격 100원");
    const version = await service.upload(ctx, {
      documentId: "doc",
      title: "상품",
      bytes,
      expectedHash: sha256(bytes),
      mimeType: "text/plain",
    });
    const event = {
      eventId: "e-dup",
      documentId: "doc",
      sequence: 1,
      type: "APPROVE" as const,
      versionId: version.versionId,
      allowedGroups: ["sales"],
    };
    const results = await Promise.all([
      service.applyEvent(ctx, event),
      service.applyEvent(ctx, event),
    ]);
    assert.equal(results.filter((item) => item.duplicate).length, 1);
    assert.equal(results.filter((item) => !item.duplicate).length, 1);
    const counted = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "knowledge_sync_events" WHERE "id"=$1`,
      [event.eventId],
    );
    assert.equal(counted.rows[0]?.n, 1);
    const doc = await repo.getDoc("fm", "doc");
    assert.equal(doc?.sequence, 1);
    assert.equal(doc?.approvedVersionId, version.versionId);
    await assert.rejects(() => service.applyEvent(ctx, { ...event, type: "REVOKE" }));
    const after = await repo.getDoc("fm", "doc");
    assert.equal(after?.sequence, 1);
    assert.equal(after?.approvedVersionId, version.versionId);
  });
});
