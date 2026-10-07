import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { sha256 } from "./hash";
import type { KnowledgeRepository } from "./repository";
import { awsS3ClientConfig, createAwsObjectClient, privatePutObjectInput } from "./s3-client";
import { S3StorageAdapter, type ObjectBytesClient } from "./s3-storage";
import { KnowledgeService } from "./service";
import { LocalFsStorageAdapter, type StorageAdapter } from "./storage";
import { createKnowledgeStorage, isLoopbackHost, resolveStorageSettings } from "./storage-create";
import { finishRehearsalReport, rehearsalExitCode } from "./rehearsal-report";
import { rehearsalOwnership, TrackingStorageAdapter } from "./tracked-storage";
import type { S3StorageSettings } from "./storage-create";
import { executeRemoteRehearsal } from "../../../scripts/knowledge-storage-scenario";

function missing(name: "NotFound" | "NoSuchKey", status = 404) {
  return Object.assign(new Error(name), {
    name,
    $metadata: { httpStatusCode: status },
  });
}

function failed(name: string, status?: number, code?: string) {
  return Object.assign(new Error(name), {
    name,
    ...(status === undefined ? {} : { $metadata: { httpStatusCode: status } }),
    ...(code === undefined ? {} : { code }),
  });
}

class MemoryObjectClient implements ObjectBytesClient {
  readonly objects = new Map<string, Buffer>();

  async putObject(key: string, bytes: Buffer) {
    this.objects.set(key, Buffer.from(bytes));
  }

  async getObject(key: string) {
    const found = this.objects.get(key);
    if (!found) throw missing("NoSuchKey");
    return Buffer.from(found);
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  async headObject(key: string) {
    if (!this.objects.has(key)) throw missing("NotFound");
  }
}

async function assertStorageContract(storage: StorageAdapter) {
  const bytes = Buffer.from("양모 원문");
  assert.equal(await storage.exists("originals/fm/missing"), false);
  await storage.put("originals/fm/v1", bytes);
  assert.equal(await storage.exists("originals/fm/v1"), true);
  assert.ok((await storage.get("originals/fm/v1")).equals(bytes));
  await storage.delete("originals/fm/v1");
  assert.equal(await storage.exists("originals/fm/v1"), false);
  await assert.rejects(() => storage.get("originals/fm/v1"));
  await storage.delete("originals/fm/v1");
  await assert.rejects(() => storage.put("../outside", bytes), /invalid storage key/);
}

test("contract: local filesystem adapter", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "knowledge-storage-local-"));
  try {
    await assertStorageContract(new LocalFsStorageAdapter(dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("contract: S3StorageAdapter over an in-memory client, not a remote connection", async () => {
  await assertStorageContract(new S3StorageAdapter(new MemoryObjectClient()));
});

test("S3 exists treats only a missing-object response as false", async () => {
  const cases: { error: Error; absent: boolean }[] = [
    { error: missing("NotFound", 404), absent: true },
    { error: missing("NoSuchKey", 404), absent: true },
    { error: missing("NotFound"), absent: true },
    { error: Object.assign(new Error("NotFound"), { name: "NotFound" }), absent: true },
    { error: failed("AccessDenied", 403), absent: false },
    { error: failed("NotFound", 403), absent: false },
    { error: failed("NoSuchBucket", 404), absent: false },
    { error: failed("TimeoutError"), absent: false },
    { error: failed("InternalError", 500), absent: false },
    { error: failed("NetworkingError", undefined, "ECONNRESET"), absent: false },
  ];
  for (const item of cases) {
    const client: ObjectBytesClient = {
      async putObject() {},
      async getObject() {
        throw missing("NoSuchKey");
      },
      async deleteObject() {},
      async headObject() {
        throw item.error;
      },
    };
    const storage = new S3StorageAdapter(client);
    if (item.absent) {
      assert.equal(await storage.exists("originals/fm/v1"), false, item.error.name);
    } else {
      await assert.rejects(() => storage.exists("originals/fm/v1"), item.error);
    }
  }
});

test("unclear S3 upload is confirmed with a reread and hash", async () => {
  const bytes = Buffer.from("양모 원문");
  const stored = new Map<string, Buffer>();
  let gets = 0;
  const client: ObjectBytesClient = {
    async putObject(_key, body) {
      stored.set("originals/fm/v1", Buffer.from(body));
      throw failed("TimeoutError", 503);
    },
    async getObject(key) {
      gets += 1;
      const found = stored.get(key);
      if (!found) throw missing("NoSuchKey");
      return Buffer.from(found);
    },
    async deleteObject() {},
    async headObject() {},
  };
  const storage = new S3StorageAdapter(client);
  await storage.put("originals/fm/v1", bytes);
  assert.equal(gets, 1);
  assert.equal(sha256(stored.get("originals/fm/v1") ?? Buffer.alloc(0)), sha256(bytes));
});

test("unclear S3 upload stays failed when the object is absent or the hash differs", async () => {
  const absent: ObjectBytesClient = {
    async putObject() {
      throw failed("InternalError", 500);
    },
    async getObject() {
      throw missing("NoSuchKey");
    },
    async deleteObject() {},
    async headObject() {},
  };
  await assert.rejects(
    () => new S3StorageAdapter(absent).put("originals/fm/v1", Buffer.from("a")),
    /InternalError/,
  );

  const mismatch: ObjectBytesClient = {
    async putObject() {
      throw failed("ServiceUnavailable", 503);
    },
    async getObject() {
      return Buffer.from("other");
    },
    async deleteObject() {},
    async headObject() {},
  };
  await assert.rejects(
    () => new S3StorageAdapter(mismatch).put("originals/fm/v1", Buffer.from("a")),
    (error: unknown) => {
      assert.equal(error instanceof Error ? error.name : "", "StoredHashMismatch");
      return true;
    },
  );
});

test("definite S3 upload rejection is not hidden by a reread", async () => {
  let gets = 0;
  const client: ObjectBytesClient = {
    async putObject() {
      throw failed("AccessDenied", 403);
    },
    async getObject() {
      gets += 1;
      return Buffer.from("a");
    },
    async deleteObject() {},
    async headObject() {},
  };
  await assert.rejects(
    () => new S3StorageAdapter(client).put("originals/fm/v1", Buffer.from("a")),
    /AccessDenied/,
  );
  assert.equal(gets, 0);
});

test("a run prefix and tracked cleanup leave unrelated objects unchanged", async () => {
  const memory = new MemoryObjectClient();
  memory.objects.set("existing", Buffer.from("keep"));
  const runA = new S3StorageAdapter(memory, { keyPrefix: "knowledge-rehearsal/run-a" });
  const runB = new S3StorageAdapter(memory, { keyPrefix: "knowledge-rehearsal/run-b" });
  await runA.put("originals/fm/v1", Buffer.from("a"));
  await runB.put("originals/fm/v1", Buffer.from("b"));
  const tracked = new TrackingStorageAdapter(runA, rehearsalOwnership("knowledge-rehearsal/run-a"));
  await tracked.put("originals/fm/v2", Buffer.from("new"));
  assert.deepEqual(await tracked.deleteTracked(), []);
  assert.equal(memory.objects.has("knowledge-rehearsal/run-a/originals/fm/v1"), true);
  assert.equal(memory.objects.has("knowledge-rehearsal/run-a/originals/fm/v2"), false);
  assert.ok(memory.objects.get("knowledge-rehearsal/run-b/originals/fm/v1")?.equals(Buffer.from("b")));
  assert.ok(memory.objects.get("existing")?.equals(Buffer.from("keep")));
});

test("tracked cleanup records a delete failure", async () => {
  const inner = new S3StorageAdapter(new MemoryObjectClient());
  await inner.put("originals/fm/v1", Buffer.from("a"));
  const storage = new TrackingStorageAdapter(
    {
      put: (key, bytes) => inner.put(key, bytes),
      get: (key) => inner.get(key),
      exists: (key) => inner.exists(key),
      async delete() {
        throw failed("AccessDenied", 403);
      },
    },
    rehearsalOwnership(""),
  );
  await storage.put("originals/fm/v1", Buffer.from("a"));
  assert.deepEqual(await storage.deleteTracked(), [
    { key: "originals/fm/v1", errorName: "AccessDenied", httpStatus: 403 },
  ]);
  assert.equal(await inner.exists("originals/fm/v1"), true);
});

test("database failure during upload records storage cleanup failure", async () => {
  const inner = new S3StorageAdapter(new MemoryObjectClient());
  const storage: StorageAdapter = {
    put: (key, bytes) => inner.put(key, bytes),
    get: (key) => inner.get(key),
    exists: (key) => inner.exists(key),
    async delete() {
      throw failed("AccessDenied", 403);
    },
  };
  const failures: { key: string; errorName: string; httpStatus: number | null }[] = [];
  const service = new KnowledgeService(
    {
      async transaction() {
        throw new Error("db failed");
      },
    } as unknown as KnowledgeRepository,
    storage,
    { onCleanupFailure: (items) => failures.push(...items) },
  );
  const bytes = Buffer.from("양모");
  await assert.rejects(() =>
    service.upload(
      { kind: "sync-service", tenantId: "fm" },
      {
        documentId: "doc",
        title: "상품",
        bytes,
        expectedHash: sha256(bytes),
        mimeType: "text/plain",
      },
    ),
    /db failed/,
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.errorName, "AccessDenied");
  assert.equal(failures[0]?.httpStatus, 403);
  assert.match(failures[0]?.key ?? "", /^originals\/fm\//);
});

test("storage settings default to local and reject non-local HTTP endpoints", () => {
  const local = resolveStorageSettings({});
  assert.equal(local.driver, "local");
  if (local.driver !== "local") return;
  assert.equal(local.root, path.join(process.cwd(), "uploads", "knowledge"));

  assert.throws(
    () =>
      resolveStorageSettings({
        KNOWLEDGE_STORAGE_DRIVER: "s3",
        KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
      }),
    /KNOWLEDGE_STORAGE_BUCKET is required/,
  );
  assert.throws(
    () =>
      resolveStorageSettings({
        KNOWLEDGE_STORAGE_DRIVER: "s3",
        KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
        KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
        KNOWLEDGE_STORAGE_ENDPOINT: "http://s3.amazonaws.com",
        KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT: "true",
      }),
    /storage endpoint must use https/,
  );
  assert.throws(
    () =>
      resolveStorageSettings({
        KNOWLEDGE_STORAGE_DRIVER: "s3",
        KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
        KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
        KNOWLEDGE_STORAGE_ENDPOINT: "https://user:secret@127.0.0.1",
      }),
    /must not include credentials/,
  );

  const loopback = resolveStorageSettings({
    KNOWLEDGE_STORAGE_DRIVER: "s3",
    KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
    KNOWLEDGE_STORAGE_REGION: "us-east-1",
    KNOWLEDGE_STORAGE_ENDPOINT: "http://127.0.0.1:9000",
    KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT: "true",
    KNOWLEDGE_STORAGE_FORCE_PATH_STYLE: "true",
    KNOWLEDGE_STORAGE_PREFIX: "knowledge",
  });
  assert.equal(loopback.driver, "s3");
  if (loopback.driver !== "s3") return;
  assert.equal(loopback.forcePathStyle, true);
  assert.equal(loopback.endpoint, "http://127.0.0.1:9000");

  assert.equal(new URL("http://[::1]:9000").hostname, "[::1]");
  assert.equal(isLoopbackHost("[::1]"), true);
  assert.equal(isLoopbackHost("::1"), true);
  const ipv6 = resolveStorageSettings({
    KNOWLEDGE_STORAGE_DRIVER: "s3",
    KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
    KNOWLEDGE_STORAGE_REGION: "us-east-1",
    KNOWLEDGE_STORAGE_ENDPOINT: "http://[::1]:9000",
    KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT: "true",
    KNOWLEDGE_STORAGE_FORCE_PATH_STYLE: "true",
  });
  assert.equal(ipv6.driver, "s3");
  if (ipv6.driver !== "s3") return;
  assert.equal(ipv6.endpoint, "http://[::1]:9000");
  assert.equal(ipv6.forcePathStyle, true);
  assert.throws(
    () =>
      resolveStorageSettings({
        KNOWLEDGE_STORAGE_DRIVER: "s3",
        KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
        KNOWLEDGE_STORAGE_REGION: "us-east-1",
        KNOWLEDGE_STORAGE_ENDPOINT: "http://[::1]:9000",
      }),
    /storage endpoint must use https/,
  );

  const remote = resolveStorageSettings({
    KNOWLEDGE_STORAGE_DRIVER: "s3",
    KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
    KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
    KNOWLEDGE_STORAGE_ENDPOINT: "https://s3.ap-northeast-2.amazonaws.com",
  });
  if (remote.driver !== "s3") return;
  assert.equal(remote.forcePathStyle, false);
  assert.throws(
    () =>
      resolveStorageSettings({
        KNOWLEDGE_STORAGE_DRIVER: "s3",
        KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
        KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
        KNOWLEDGE_STORAGE_ENDPOINT: "https://s3.ap-northeast-2.amazonaws.com",
        KNOWLEDGE_STORAGE_FORCE_PATH_STYLE: "true",
      }),
    /path-style addressing is limited to a local endpoint/,
  );
});

test("S3 client config omits credentials and object input omits a public ACL", () => {
  const config = awsS3ClientConfig({
    region: "ap-northeast-2",
    bucket: "private-bucket",
    forcePathStyle: false,
  });
  assert.equal("credentials" in config, false);
  assert.equal(config.region, "ap-northeast-2");
  assert.deepEqual(
    Object.keys(privatePutObjectInput("private-bucket", "originals/fm/v1", Buffer.from("a"))).sort(),
    ["Body", "Bucket", "Key"],
  );
  const created = createAwsObjectClient({
    region: "ap-northeast-2",
    bucket: "private-bucket",
    forcePathStyle: false,
  });
  created.close();
});

test("factory uses the injected client and does not require static access keys", async () => {
  const memory = new MemoryObjectClient();
  const storage = createKnowledgeStorage(
    {
      KNOWLEDGE_STORAGE_DRIVER: "s3",
      KNOWLEDGE_STORAGE_BUCKET: "private-bucket",
      KNOWLEDGE_STORAGE_REGION: "ap-northeast-2",
      KNOWLEDGE_STORAGE_PREFIX: "tenant-prefix",
    },
    { objects: memory },
  );
  await storage.put("originals/fm/v1", Buffer.from("a"));
  assert.ok(memory.objects.has("tenant-prefix/originals/fm/v1"));
  assert.equal(memory.objects.has("originals/fm/v1"), false);
});

test("ambiguous put stays a cleanup candidate and removes only this run's new key", async () => {
  const objects = new Map<string, Buffer>();
  const prefix = "knowledge-rehearsal/run-a";
  const client: ObjectBytesClient = {
    async putObject(key, bytes) {
      objects.set(key, Buffer.from(bytes));
      throw failed("TimeoutError", 503);
    },
    async getObject() {
      throw failed("NetworkingError", undefined, "ECONNRESET");
    },
    async deleteObject(key) {
      objects.delete(key);
    },
    async headObject(key) {
      if (!objects.has(key)) throw missing("NotFound");
    },
  };
  objects.set("existing", Buffer.from("keep"));
  objects.set("knowledge-rehearsal/run-b/originals/fm/v1", Buffer.from("other"));
  objects.set(`${prefix}/originals/fm/old`, Buffer.from("old"));
  const tracked = new TrackingStorageAdapter(
    new S3StorageAdapter(client, { keyPrefix: prefix }),
    rehearsalOwnership(prefix),
  );
  await assert.rejects(() => tracked.put("originals/fm/v1", Buffer.from("new-object")), /TimeoutError/);
  assert.ok(objects.has(`${prefix}/originals/fm/v1`));
  await assert.rejects(() => tracked.delete("existing"), /outside this run/);
  assert.deepEqual(await tracked.deleteTracked(), []);
  assert.equal(objects.has(`${prefix}/originals/fm/v1`), false);
  assert.ok(objects.get("existing")?.equals(Buffer.from("keep")));
  assert.ok(objects.get("knowledge-rehearsal/run-b/originals/fm/v1")?.equals(Buffer.from("other")));
  assert.ok(objects.get(`${prefix}/originals/fm/old`)?.equals(Buffer.from("old")));
});

test("failed cleanup reports the unresolved key and a failed rehearsal exit", async () => {
  const objects = new Map<string, Buffer>();
  const prefix = "knowledge-rehearsal/run-a";
  const client: ObjectBytesClient = {
    async putObject(key, bytes) {
      objects.set(key, Buffer.from(bytes));
      throw failed("TimeoutError", 503);
    },
    async getObject() {
      throw failed("TimeoutError");
    },
    async deleteObject() {
      throw failed("AccessDenied", 403);
    },
    async headObject() {},
  };
  objects.set("existing", Buffer.from("keep"));
  objects.set("knowledge-rehearsal/run-b/originals/fm/v1", Buffer.from("other"));
  const tracked = new TrackingStorageAdapter(
    new S3StorageAdapter(client, { keyPrefix: prefix }),
    rehearsalOwnership(prefix),
  );
  await assert.rejects(() => tracked.put("originals/fm/v1", Buffer.from("new-object")));
  const cleanupFailures = await tracked.deleteTracked();
  const report = finishRehearsalReport({
    remoteVerification: "not-run",
    remoteConnected: false,
    scenarioPassed: true,
    cleanupFailures,
    adapter: "S3StorageAdapter",
  });
  assert.equal(report.scenarioPassed, true);
  assert.equal(report.cleanupPassed, false);
  assert.deepEqual(report.unresolvedObjects, [
    { key: "originals/fm/v1", errorName: "AccessDenied", httpStatus: 403 },
  ]);
  assert.equal(rehearsalExitCode(report), 1);
  assert.equal(JSON.stringify(report).includes("stack"), false);
  assert.ok(objects.get(`${prefix}/originals/fm/v1`)?.equals(Buffer.from("new-object")));
  assert.ok(objects.get("existing")?.equals(Buffer.from("keep")));
  assert.ok(objects.get("knowledge-rehearsal/run-b/originals/fm/v1")?.equals(Buffer.from("other")));
});

test("service upload records an uncertain object when confirmation also fails", async () => {
  const objects = new Map<string, Buffer>();
  const client: ObjectBytesClient = {
    async putObject(key, bytes) {
      objects.set(key, Buffer.from(bytes));
      throw failed("TimeoutError", 503);
    },
    async getObject() {
      throw failed("NetworkingError", undefined, "ECONNRESET");
    },
    async deleteObject() {},
    async headObject() {},
  };
  const records: { key: string; outcome: string; reconciliationRequired: boolean; cleanupRequired: boolean; errorName: string }[] = [];
  const service = new KnowledgeService(
    { async transaction() { return undefined; } } as unknown as KnowledgeRepository,
    new S3StorageAdapter(client),
    { onUnresolvedStorage: (record) => records.push(record) },
  );
  const bytes = Buffer.from("양모");
  await assert.rejects(() =>
    service.upload(
      { kind: "sync-service", tenantId: "fm" },
      {
        documentId: "doc",
        title: "상품",
        bytes,
        expectedHash: sha256(bytes),
        mimeType: "text/plain",
      },
    ),
    /TimeoutError/,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0]?.outcome, "uncertain");
  assert.equal(records[0]?.reconciliationRequired, true);
  assert.equal(records[0]?.cleanupRequired, true);
  assert.equal(records[0]?.errorName, "TimeoutError");
  assert.match(records[0]?.key ?? "", /^originals\/fm\//);
  const storedKey = records[0]?.key ?? "";
  assert.ok(objects.get(storedKey)?.equals(bytes));
});

const remoteSettings: S3StorageSettings = {
  driver: "s3",
  bucket: "private-bucket",
  region: "ap-northeast-2",
  forcePathStyle: false,
};

function rejectingClient(error: Error): ObjectBytesClient {
  return {
    async putObject() {
      throw error;
    },
    async getObject() {
      throw error;
    },
    async deleteObject() {
      throw error;
    },
    async headObject() {
      throw error;
    },
  };
}

test("remoteConnected is false when no object request succeeds", async () => {
  for (const error of [
    failed("CredentialsProviderError"),
    failed("NetworkingError", undefined, "ECONNREFUSED"),
  ]) {
    const report = await executeRemoteRehearsal(remoteSettings, rejectingClient(error));
    assert.equal(report.remoteVerification, "executed");
    assert.equal(report.remoteConnected, false);
    assert.equal(report.scenarioPassed, false);
    assert.equal(rehearsalExitCode(report), 1);
    assert.equal(JSON.stringify(report).includes("stack"), false);
    assert.equal(JSON.stringify(report).includes("Credential"), error.name === "CredentialsProviderError");
  }
});

test("remoteConnected stays true when a later scenario step fails", async () => {
  const memory = new MemoryObjectClient();
  memory.objects.set("existing", Buffer.from("keep"));
  let reads = 0;
  const objects: ObjectBytesClient = {
    putObject: (key, bytes) => memory.putObject(key, bytes),
    async getObject(key) {
      reads += 1;
      if (reads > 1) throw failed("ScenarioInterrupted");
      return memory.getObject(key);
    },
    deleteObject: (key) => memory.deleteObject(key),
    headObject: (key) => memory.headObject(key),
  };
  const report = await executeRemoteRehearsal(remoteSettings, objects);
  assert.equal(report.remoteConnected, true);
  assert.equal(report.scenarioPassed, false);
  assert.equal(report.cleanupPassed, true);
  assert.deepEqual(report.unresolvedObjects, []);
  assert.equal(report.scenarioErrorName, "ScenarioInterrupted");
  assert.equal(rehearsalExitCode(report), 1);
  assert.equal(JSON.stringify(report).includes("stack"), false);
  assert.ok(memory.objects.get("existing")?.equals(Buffer.from("keep")));
});

test("remoteConnected stays true when only cleanup fails", async () => {
  const memory = new MemoryObjectClient();
  memory.objects.set("existing", Buffer.from("keep"));
  memory.objects.set("knowledge-rehearsal/other-run/originals/fm/v1", Buffer.from("other"));
  const objects: ObjectBytesClient = {
    putObject: (key, bytes) => memory.putObject(key, bytes),
    getObject: (key) => memory.getObject(key),
    headObject: (key) => memory.headObject(key),
    async deleteObject() {
      throw failed("AccessDenied", 403);
    },
  };
  const report = await executeRemoteRehearsal(remoteSettings, objects);
  assert.equal(report.remoteConnected, true);
  assert.equal(report.scenarioPassed, true);
  assert.equal(report.cleanupPassed, false);
  assert.equal(report.unresolvedObjects.length, 1);
  assert.equal(report.unresolvedObjects[0]?.errorName, "AccessDenied");
  assert.equal(report.unresolvedObjects[0]?.httpStatus, 403);
  assert.equal(rehearsalExitCode(report), 1);
  assert.equal(JSON.stringify(report).includes("stack"), false);
  assert.ok(memory.objects.get("existing")?.equals(Buffer.from("keep")));
  assert.ok(
    memory.objects.get("knowledge-rehearsal/other-run/originals/fm/v1")?.equals(Buffer.from("other")),
  );
  const kept = [...memory.objects.keys()].filter((key) => key.startsWith("knowledge-rehearsal/"));
  assert.equal(kept.length, 2);
});

test("remote S3 rehearsal is not run without the explicit option", () => {
  const env = { ...process.env };
  for (const name of [
    "KNOWLEDGE_STORAGE_DRIVER",
    "KNOWLEDGE_STORAGE_BUCKET",
    "KNOWLEDGE_STORAGE_REGION",
    "KNOWLEDGE_STORAGE_ENDPOINT",
    "KNOWLEDGE_STORAGE_REMOTE_VERIFY",
    "KNOWLEDGE_STORAGE_PREFIX",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_PROFILE",
    "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
    "AWS_WEB_IDENTITY_TOKEN_FILE",
  ]) {
    delete env[name];
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/knowledge-storage-scenario.ts", "--adapter", "s3"],
    { cwd: process.cwd(), env, encoding: "utf8" },
  );
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout) as {
    remoteVerification: string;
    remoteConnected: boolean;
  };
  assert.equal(report.remoteVerification, "not-run");
  assert.equal(report.remoteConnected, false);
});

test(
  "remote S3 connection",
  {
    skip: "not run: no remote account is configured for this development step. In-memory SDK tests are not a connection success.",
  },
  () => {},
);
