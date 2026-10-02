/**
 * One-document rehearsal. The default adapter is local.
 * A remote S3 run happens only with --adapter s3 plus the explicit settings
 * in docs/KNOWLEDGE_S3_REMOTE_VERIFY.md. This file does not claim that remote
 * storage integration is complete.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";

import { userContextFromSession } from "../src/lib/knowledge/auth-context";
import { sha256 } from "../src/lib/knowledge/hash";
import { applyKnowledgeMigration, pgliteExecutor } from "../src/lib/knowledge/pglite-executor";
import { SqlKnowledgeRepository } from "../src/lib/knowledge/repository";
import { createAwsObjectClient } from "../src/lib/knowledge/s3-client";
import { S3StorageAdapter } from "../src/lib/knowledge/s3-storage";
import { KnowledgeService } from "../src/lib/knowledge/service";
import { LocalFsStorageAdapter, originalObjectKey, qualifyStorageKey } from "../src/lib/knowledge/storage";
import type { StorageAdapter } from "../src/lib/knowledge/storage";
import { resolveStorageSettings, type S3StorageSettings } from "../src/lib/knowledge/storage-create";
import { safeErrorName } from "../src/lib/knowledge/storage-error";
import { finishRehearsalReport, rehearsalExitCode } from "../src/lib/knowledge/rehearsal-report";
import { rehearsalOwnership, TrackingStorageAdapter } from "../src/lib/knowledge/tracked-storage";

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

async function runStorageScenario(input: {
  storage: StorageAdapter;
  assertPlaced: (key: string) => Promise<void>;
}): Promise<{
  passed: boolean;
  steps: Step[];
  versionId?: string;
  sha256?: string;
  scenarioErrorName?: string;
}> {
  const migration = path.join(
    process.cwd(),
    "prisma/migrations/20261002120000_knowledge_v1/migration.sql",
  );
  await access(migration);

  const db = new PGlite();
  const steps: Step[] = [];
  let versionId: string | undefined;
  let hash: string | undefined;
  let scenarioErrorName: string | undefined;
  const record = (id: string, ok: boolean, detail: string) => {
    steps.push({ id, ok, detail });
    assert.equal(ok, true, `${id}: ${detail}`);
  };

  try {
    await applyKnowledgeMigration(db);
    const repo = new SqlKnowledgeRepository(pgliteExecutor(db));
    const service = new KnowledgeService(repo, input.storage);

    const text = "양모 원단 가격 안내\n\n허용된 직원만 이 문서를 검색한다.";
    const bytes = Buffer.from(text);
    const digest = sha256(bytes);
    hash = digest;
    const uploaded = await service.upload(serviceCtx, {
      documentId: DOCUMENT_ID,
      title: "양모 원단",
      bytes,
      expectedHash: digest,
      mimeType: "text/plain",
      filename: "wool.txt",
    });
    versionId = uploaded.versionId;
    const key = originalObjectKey(TENANT, uploaded.versionId);
    const stored = await input.storage.get(key);
    await input.assertPlaced(key);
    record(
      "upload-sha256",
      sha256(stored) === hash && uploaded.hash === hash && stored.equals(bytes),
      `versionId=${uploaded.versionId} key=${key} sha256=${sha256(stored)} bytes=${stored.length}`,
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
      approved.duplicate === false && approved.sequence === 1 && jobs.length === 1 && jobs[0]?.status === "DONE",
      `sequence=${approved.duplicate ? "duplicate" : approved.sequence} jobs=${JSON.stringify(
        jobs.map((job) => ({ status: job.status, error: job.error ?? null })),
      )} versionId=${uploaded.versionId}`,
    );

    const hits = await service.search(sales, "양모");
    const hit = hits[0];
    const downloaded = await service.download(sales, DOCUMENT_ID, uploaded.versionId);
    record(
      "allowed-search-download",
      hits.length === 1 &&
        hit?.versionId === uploaded.versionId &&
        hit.hash === hash &&
        sha256(downloaded) === hash &&
        downloaded.equals(bytes),
      `hits=${hits.length} versionId=${hit?.versionId ?? ""} sha256=${sha256(downloaded)}`,
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
    const stillThere = await input.storage.exists(key);
    const stillHash = sha256(await input.storage.get(key));
    record(
      "revoke-blocks-search-download",
      revoked.duplicate === false &&
        after.hits === 0 &&
        after.download === "forbidden" &&
        stillThere &&
        stillHash === hash,
      `searchHits=${after.hits} download=${after.download} objectRemains=${stillThere} sha256=${stillHash}`,
    );
  } catch (error) {
    scenarioErrorName = safeErrorName(error);
  } finally {
    await db.close();
  }
  return {
    passed: scenarioErrorName === undefined,
    steps,
    versionId,
    sha256: hash,
    scenarioErrorName,
  };
}

function writeReport(report: ReturnType<typeof finishRehearsalReport>) {
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return rehearsalExitCode(report);
}

export async function runLocalRehearsal() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-phase2-local-"));
  const objectRoot = path.join(dir, "objects");
  const storage = new TrackingStorageAdapter(
    new LocalFsStorageAdapter(objectRoot),
    rehearsalOwnership(""),
  );
  const scenario = await runStorageScenario({
    storage,
    assertPlaced: async (key) => {
      const objectPath = path.join(objectRoot, key);
      assert.equal(objectPath.startsWith(`${objectRoot}${path.sep}`), true);
      assert.equal(await storage.exists(key), true);
    },
  });
  const cleanupFailures = await storage.deleteTracked();
  await rm(dir, { recursive: true, force: true });
  return writeReport(
    finishRehearsalReport({
      remoteVerification: "not-run",
      remoteConnected: false,
      scenarioPassed: scenario.passed,
      cleanupFailures,
      scenarioErrorName: scenario.scenarioErrorName,
      adapter: "LocalFsStorageAdapter",
      catalog: "PGlite in-memory",
      tenantId: TENANT,
      documentId: DOCUMENT_ID,
      versionId: scenario.versionId,
      sha256: scenario.sha256,
      steps: scenario.steps,
      objectRoot,
    }),
  );
}

async function runRemoteRehearsal(settings: S3StorageSettings) {
  const runPrefix = settings.keyPrefix
    ? `${settings.keyPrefix}/knowledge-rehearsal/${randomUUID()}`
    : `knowledge-rehearsal/${randomUUID()}`;
  const aws = createAwsObjectClient(settings);
  const storage = new TrackingStorageAdapter(
    new S3StorageAdapter(aws.objects, { keyPrefix: runPrefix }),
    rehearsalOwnership(runPrefix),
  );
  const scenario = await runStorageScenario({
    storage,
    assertPlaced: async (key) => {
      const stored = qualifyStorageKey(runPrefix, key);
      assert.equal(stored.startsWith(`${runPrefix}/`), true);
    },
  });
  const cleanupFailures = await storage.deleteTracked();
  aws.close();
  return writeReport(
    finishRehearsalReport({
      remoteVerification: "executed",
      remoteConnected: true,
      scenarioPassed: scenario.passed,
      cleanupFailures,
      scenarioErrorName: scenario.scenarioErrorName,
      adapter: "S3StorageAdapter",
      catalog: "PGlite in-memory",
      tenantId: TENANT,
      documentId: DOCUMENT_ID,
      versionId: scenario.versionId,
      sha256: scenario.sha256,
      steps: scenario.steps,
      keyPrefix: runPrefix,
      bucket: settings.bucket,
      region: settings.region,
    }),
  );
}

function notRun(reason: string) {
  return writeReport(
    finishRehearsalReport({
      remoteVerification: "not-run",
      remoteConnected: false,
      scenarioPassed: false,
      cleanupFailures: [],
      skippedRemote: true,
      reason,
    }),
  );
}

async function main() {
  const adapterFlag = process.argv.indexOf("--adapter");
  const adapter = adapterFlag === -1 ? "local" : process.argv[adapterFlag + 1];
  if (adapter === "local" || adapter === undefined) {
    process.exitCode = await runLocalRehearsal();
    return;
  }
  if (adapter !== "s3") throw new Error("unsupported storage adapter");
  if (process.env.KNOWLEDGE_STORAGE_REMOTE_VERIFY !== "true") {
    process.exitCode = notRun(
      "S3 rehearsal requires KNOWLEDGE_STORAGE_REMOTE_VERIFY=true plus bucket and region settings",
    );
    return;
  }
  if (!process.env.KNOWLEDGE_STORAGE_BUCKET?.trim() || !process.env.KNOWLEDGE_STORAGE_REGION?.trim()) {
    process.exitCode = notRun("S3 rehearsal requires KNOWLEDGE_STORAGE_BUCKET and KNOWLEDGE_STORAGE_REGION");
    return;
  }
  const settings = resolveStorageSettings({
    KNOWLEDGE_STORAGE_DRIVER: "s3",
    KNOWLEDGE_STORAGE_BUCKET: process.env.KNOWLEDGE_STORAGE_BUCKET,
    KNOWLEDGE_STORAGE_REGION: process.env.KNOWLEDGE_STORAGE_REGION,
    KNOWLEDGE_STORAGE_ENDPOINT: process.env.KNOWLEDGE_STORAGE_ENDPOINT,
    KNOWLEDGE_STORAGE_PREFIX: process.env.KNOWLEDGE_STORAGE_PREFIX,
    KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT:
      process.env.KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT,
    KNOWLEDGE_STORAGE_FORCE_PATH_STYLE: process.env.KNOWLEDGE_STORAGE_FORCE_PATH_STYLE,
  });
  if (settings.driver !== "s3") throw new Error("expected s3 storage");
  process.exitCode = await runRemoteRehearsal(settings);
}

if (process.argv[1]?.endsWith("knowledge-storage-scenario.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${safeErrorName(error)}\n`);
    process.exitCode = 1;
  });
}
