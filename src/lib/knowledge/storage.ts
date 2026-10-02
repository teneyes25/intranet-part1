import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

export interface StorageAdapter {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}

function safeKey(key: string) {
  if (!key || key.includes("..") || path.isAbsolute(key)) {
    throw new Error("invalid storage key");
  }
  return key;
}

/** Local development adapter. Cloud provider is not selected yet. */
export class LocalFsStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    return path.join(this.root, safeKey(key));
  }

  async put(key: string, bytes: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  async get(key: string) {
    return readFile(this.resolve(key));
  }

  async exists(key: string) {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}

export function originalObjectKey(tenantId: string, versionId: string) {
  return path.posix.join("originals", tenantId, versionId);
}

export function previewObjectKey(tenantId: string, versionId: string) {
  return path.posix.join("previews", tenantId, versionId);
}
