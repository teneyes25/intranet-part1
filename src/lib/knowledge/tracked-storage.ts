import type { StorageAdapter } from "./storage";
import { describeStorageFailure, type StorageFailureRecord } from "./storage-error";

/** Records keys this instance wrote so cleanup can delete only those keys. */
export class TrackingStorageAdapter implements StorageAdapter {
  readonly keys: string[] = [];

  constructor(private readonly inner: StorageAdapter) {}

  async put(key: string, bytes: Buffer) {
    await this.inner.put(key, bytes);
    this.keys.push(key);
  }

  get(key: string) {
    return this.inner.get(key);
  }

  delete(key: string) {
    return this.inner.delete(key);
  }

  exists(key: string) {
    return this.inner.exists(key);
  }

  async deleteTracked(): Promise<StorageFailureRecord[]> {
    const failures: StorageFailureRecord[] = [];
    for (const key of this.keys) {
      try {
        await this.inner.delete(key);
      } catch (error) {
        failures.push(describeStorageFailure(key, error));
      }
    }
    return failures;
  }
}
