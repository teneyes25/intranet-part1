import { mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import path from "node:path";

export interface StorageAdapter {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export function assertStorageKey(key: string) {
  if (
    !key ||
    key.includes("..") ||
    key.includes("\\") ||
    key.startsWith("/") ||
    path.isAbsolute(key)
  ) {
    throw new Error("invalid storage key");
  }
  return key;
}

export function qualifyStorageKey(prefix: string | undefined, key: string) {
  const safeKey = assertStorageKey(key);
  const normalized = prefix?.replace(/^\/+|\/+$/g, "");
  if (!normalized) return safeKey;
  assertStorageKey(normalized);
  return assertStorageKey(`${normalized}/${safeKey}`);
}

/** Local filesystem adapter. This is the default driver. */
export class LocalFsStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    return path.join(this.root, assertStorageKey(key));
  }

  async put(key: string, bytes: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  async get(key: string) {
    return readFile(this.resolve(key));
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string) {
    try {
      await stat(this.resolve(key));
      return true;
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error ? error.code : undefined;
      if (code === "ENOENT") return false;
      throw error;
    }
  }
}

export function originalObjectKey(tenantId: string, versionId: string) {
  return path.posix.join("originals", tenantId, versionId);
}

export function previewObjectKey(tenantId: string, versionId: string) {
  return path.posix.join("previews", tenantId, versionId);
}
