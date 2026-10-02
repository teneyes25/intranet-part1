/**
 * Local-adapter rehearsal for one knowledge document.
 * This does not connect to a cloud provider and does not claim that
 * remote storage integration is complete.
 *
 * Run from the repository root:
 *   npx tsx scripts/knowledge-phase2-local-scenario.ts
 */
import assert from "node:assert/strict";
import { mkdtemp, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

import { userContextFromSession } from "../src/lib/knowledge/auth-context";
import { sha256 } from "../src/lib/knowledge/hash";
import { applyKnowledgeMigration, pgliteExecutor } from "../src/lib/knowledge/pglite-executor";
import { SqlKnowledgeRepository } from "../src/lib/knowledge/repository";
import { KnowledgeService } from "../src/lib/knowledge/service";
import { LocalFsStorageAdapter, originalObjectKey } from "../src/lib/knowledge/storage";

const TENANT = "fm";
const DOCUMENT_ID = "phase2-doc";
const serviceCtx = { kind: "sync-service" as const, tenantId: TENANT };

type Step = {
  id: string;
  ok: boolean;
  detail: string;
};

async function staff(service: KnowledgeService, userId: string) {
  const groups = await service.listStaffGroups(TENANT, userId);
  const session = userContextFromSession({
    id: userId,
    isActive: true,
    approvalStatus: "APPROVED",
    groups,
  });
  return { ...session, tenantId: TENANT, loadedGroups: groups };
}

async function expectBlocked(
  service: KnowledgeService,
  ctx: Awaited<ReturnType<typeof staff>>,
  versionId: string,
) {
  const hits = await service.search(ctx, "양모");
  let download = "returned-bytes";
  try {
    await service.download(ctx, DOCUMENT_ID, versionId);
  } catch (error) {
    download = error instanceof Error ? error.message : "threw";
  }
  return { hits: hits.length, download };
}

async function main() {
  const migration = path.join(
    process.cwd(),
    "prisma/migrations/20261002120000_knowledge_v1/migration.sql",
  );
  await access(migration);

  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-phase2-local-"));
  const objectRoot = path.join(dir, "objects");
  const db = new PGlite();
  const steps: Step[] = [];

  const record = (id: string, ok: boolean, detail: string) => {
    steps.push({ id, ok, detail });
    assert.equal(ok, true, `${id}: ${detail}`);
  };

  try {
    await applyKnowledgeMigration(db);
    const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
    const storage = new LocalFsStorageAdapter(objectRoot);
    const service = new KnowledgeService(repo, storage);

    const text = "양모 원단 가격 안내\n\n허용된 직원만 이 문서를 검색한다.";
    const bytes = Buffer.from(text);
    const hash = sha256(bytes);

    const uploaded = await service.upload(serviceCtx, {
      documentId: DOCUMENT_ID,
      title: "양모 원단",
      bytes,
      expectedHash: hash,
      mimeType: "text/plain",
      filename: "wool.txt",
    });
    const key = originalObjectKey(TENANT, uploaded.versionId);
    const stored = await storage.get(key);
    const storedHash = sha256(stored);
    const objectPath = path.join(objectRoot, key);
    record(
      "upload-sha256",
      storedHash === hash &&
        uploaded.hash === hash &&
        stored.equals(bytes) &&
        objectPath.startsWith(objectRoot + path.sep) &&
        (await storage.exists(key)),
      `versionId=${uploaded.versionId} key=${key} sha256=${storedHash} bytes=${stored.length}`,
    );

    await service.assignStaffGroups(serviceCtx, "staff-sales", ["sales"]);
    await service.assignStaffGroups(serviceCtx, "staff-design", ["design"]);
    const sales = await staff(service, "staff-sales");
    const design = await staff(service, "staff-design");

    const before = await service.search(sales, "양모");
    record(
      "unapproved-search-excluded",
      before.length === 0,
      `hits=${before.length} salesGroups=${sales.loadedGroups.join(",")}`,
    );

    const approved = await service.applyEvent(serviceCtx, {
      eventId: "phase2-approve",
      documentId: DOCUMENT_ID,
      sequence: 1,
      type: "APPROVE",
      versionId: uploaded.versionId,
      allowedGroups: ["sales"],
    });
    const jobs = await service.processJobs(serviceCtx);
    record(
      "approve-and-process",
      approved.duplicate === false &&
        approved.sequence === 1 &&
        jobs.length === 1 &&
        jobs[0]?.status === "DONE",
      `sequence=${approved.duplicate ? "duplicate" : approved.sequence} jobs=${JSON.stringify(
        jobs.map((job) => ({ status: job.status, error: job.error ?? null })),
      )} versionId=${uploaded.versionId}`,
    );

    const hits = await service.search(sales, "양모");
    const hit = hits[0];
    const downloaded = await service.download(sales, DOCUMENT_ID, uploaded.versionId);
    const downloadHash = sha256(downloaded);
    record(
      "allowed-search-download",
      hits.length === 1 &&
        hit?.versionId === uploaded.versionId &&
        hit.hash === hash &&
        downloadHash === hash &&
        downloaded.equals(bytes),
      `hits=${hits.length} versionId=${hit?.versionId ?? ""} sha256=${downloadHash}`,
    );

    const denied = await expectBlocked(service, design, uploaded.versionId);
    record(
      "disallowed-blocked",
      denied.hits === 0 && denied.download === "forbidden",
      `searchHits=${denied.hits} download=${denied.download} groups=${design.loadedGroups.join(",")}`,
    );

    const revoked = await service.applyEvent(serviceCtx, {
      eventId: "phase2-revoke",
      documentId: DOCUMENT_ID,
      sequence: 2,
      type: "REVOKE",
    });
    const after = await expectBlocked(service, sales, uploaded.versionId);
    const stillThere = await storage.exists(key);
    const stillHash = sha256(await storage.get(key));
    record(
      "revoke-blocks-search-download",
      revoked.duplicate === false &&
        after.hits === 0 &&
        after.download === "forbidden" &&
        stillThere &&
        stillHash === hash,
      `searchHits=${after.hits} download=${after.download} objectRemains=${stillThere} sha256=${stillHash}`,
    );

    const report = {
      stage: "local-adapter-rehearsal",
      cloudIntegrationComplete: false,
      providerSelected: false,
      adapter: "LocalFsStorageAdapter",
      catalog: "PGlite in-memory",
      objectRoot,
      tenantId: TENANT,
      documentId: DOCUMENT_ID,
      versionId: uploaded.versionId,
      sha256: hash,
      steps,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
