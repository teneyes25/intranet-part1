import path from "node:path";

import { createAwsObjectClient, type AwsS3ClientOptions } from "./s3-client";
import { S3StorageAdapter, type ObjectBytesClient } from "./s3-storage";
import { assertStorageKey, LocalFsStorageAdapter, type StorageAdapter } from "./storage";

export type LocalStorageSettings = {
  driver: "local";
  root: string;
};

export type S3StorageSettings = {
  driver: "s3";
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  keyPrefix?: string;
};

export type StorageSettings = LocalStorageSettings | S3StorageSettings;

function required(value: string | undefined, name: string) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

/** WHATWG URL.hostname keeps brackets around IPv6, so `[::1]` and `::1` are the same host. */
export function isLoopbackHost(hostname: string) {
  const normalized =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

/**
 * Remote endpoints must be HTTPS.
 * HTTP is accepted only for an explicit loopback test endpoint.
 */
export function assertStorageEndpoint(endpoint: string, allowInsecureLocal: boolean) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("storage endpoint must use https");
  }
  if (url.username || url.password) {
    throw new Error("storage endpoint must not include credentials");
  }
  if (url.protocol === "https:") return;
  if (
    url.protocol === "http:" &&
    allowInsecureLocal &&
    isLoopbackHost(url.hostname)
  ) {
    return;
  }
  throw new Error("storage endpoint must use https");
}

export function resolveStorageSettings(
  env: Record<string, string | undefined>,
): StorageSettings {
  const driver = (env.KNOWLEDGE_STORAGE_DRIVER ?? "local").trim().toLowerCase();
  if (driver === "" || driver === "local") {
    return {
      driver: "local",
      root:
        env.KNOWLEDGE_STORAGE_LOCAL_ROOT?.trim() ||
        path.join(process.cwd(), "uploads", "knowledge"),
    };
  }
  if (driver !== "s3") throw new Error("unsupported storage driver");

  const endpoint = env.KNOWLEDGE_STORAGE_ENDPOINT?.trim();
  const allowInsecureLocal = env.KNOWLEDGE_STORAGE_ALLOW_INSECURE_LOCAL_ENDPOINT === "true";
  if (endpoint) assertStorageEndpoint(endpoint, allowInsecureLocal);

  const forceRequested = env.KNOWLEDGE_STORAGE_FORCE_PATH_STYLE === "true";
  let forcePathStyle = false;
  if (forceRequested) {
    if (!endpoint) throw new Error("path-style addressing is limited to a local endpoint");
    const host = new URL(endpoint).hostname;
    if (!isLoopbackHost(host)) {
      throw new Error("path-style addressing is limited to a local endpoint");
    }
    forcePathStyle = true;
  }

  const prefix = env.KNOWLEDGE_STORAGE_PREFIX?.trim();
  if (prefix) assertStorageKey(prefix);
  return {
    driver: "s3",
    bucket: required(env.KNOWLEDGE_STORAGE_BUCKET, "KNOWLEDGE_STORAGE_BUCKET"),
    region: required(env.KNOWLEDGE_STORAGE_REGION, "KNOWLEDGE_STORAGE_REGION"),
    endpoint: endpoint || undefined,
    forcePathStyle,
    keyPrefix: prefix || undefined,
  };
}

export function createKnowledgeStorage(
  env: Record<string, string | undefined>,
  deps?: { objects?: ObjectBytesClient },
): StorageAdapter {
  const settings = resolveStorageSettings(env);
  if (settings.driver === "local") return new LocalFsStorageAdapter(settings.root);
  const objects = deps?.objects ?? createAwsObjectClient(toAwsOptions(settings)).objects;
  return new S3StorageAdapter(objects, { keyPrefix: settings.keyPrefix });
}

function toAwsOptions(settings: S3StorageSettings): AwsS3ClientOptions {
  return {
    region: settings.region,
    bucket: settings.bucket,
    endpoint: settings.endpoint,
    forcePathStyle: settings.forcePathStyle,
  };
}
