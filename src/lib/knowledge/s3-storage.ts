import { sha256 } from "./hash";
import type { StorageAdapter } from "./storage";
import { qualifyStorageKey } from "./storage";
import { isAmbiguousStorageError, isMissingObjectError } from "./storage-error";

/** Narrow object API. The AWS SDK binding and tests both implement this. */
export interface ObjectBytesClient {
  putObject(key: string, bytes: Buffer): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<void>;
}

/**
 * S3-compatible original store.
 * Objects are private: this class does not set an ACL and does not create a download URL.
 */
export class S3StorageAdapter implements StorageAdapter {
  constructor(
    private readonly objects: ObjectBytesClient,
    private readonly options: { keyPrefix?: string } = {},
  ) {}

  storedKey(key: string) {
    return qualifyStorageKey(this.options.keyPrefix, key);
  }

  async put(key: string, bytes: Buffer) {
    const storedKey = this.storedKey(key);
    try {
      await this.objects.putObject(storedKey, bytes);
    } catch (error) {
      if (!isAmbiguousStorageError(error)) throw error;
      await this.confirmPut(storedKey, bytes, error);
    }
  }

  private async confirmPut(storedKey: string, bytes: Buffer, cause: unknown) {
    let stored: Buffer;
    try {
      stored = await this.objects.getObject(storedKey);
    } catch (getError) {
      if (isMissingObjectError(getError)) throw cause;
      throw cause;
    }
    if (sha256(stored) !== sha256(bytes)) {
      throw Object.assign(new Error("stored hash mismatch"), {
        name: "StoredHashMismatch",
        cause,
      });
    }
  }

  async get(key: string) {
    return this.objects.getObject(this.storedKey(key));
  }

  async delete(key: string) {
    await this.objects.deleteObject(this.storedKey(key));
  }

  async exists(key: string) {
    try {
      await this.objects.headObject(this.storedKey(key));
      return true;
    } catch (error) {
      if (isMissingObjectError(error)) return false;
      throw error;
    }
  }
}
