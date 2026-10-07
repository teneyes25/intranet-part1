import type { StorageAdapter } from "./storage";
import { qualifyStorageKey } from "./storage";
import { describeStorageFailure, type StorageFailureRecord } from "./storage-error";

/** Rehearsal ownership. Only keys under this stored prefix may be deleted. */
export type RehearsalOwnership = {
  storedPrefix: string;
};

export function rehearsalOwnership(storedPrefix: string): RehearsalOwnership {
  const normalized = storedPrefix.replace(/^\/+|\/+$/g, "");
  if (normalized) qualifyStorageKey(normalized, "owned");
  return { storedPrefix: normalized };
}

/**
 * Rehearsal cleanup tracker.
 * A key is registered before the write, so a stored object whose response was lost
 * remains a cleanup candidate. Deletes are limited to those candidates and, when set,
 * to the stored prefix owned by this run.
 */
export class TrackingStorageAdapter implements StorageAdapter {
  private readonly candidates: string[] = [];

  constructor(
    private readonly inner: StorageAdapter,
    private readonly ownership: RehearsalOwnership,
  ) {}

  private storedKey(key: string) {
    return qualifyStorageKey(this.ownership.storedPrefix || undefined, key);
  }

  private assertOwned(key: string) {
    if (!this.candidates.includes(key)) {
      throw Object.assign(new Error("storage key is outside this run"), {
        name: "OutsideOwnership",
      });
    }
    const stored = this.storedKey(key);
    const prefix = this.ownership.storedPrefix;
    if (prefix && stored !== prefix && !stored.startsWith(`${prefix}/`)) {
      throw Object.assign(new Error("storage key is outside this run"), {
        name: "OutsideOwnership",
      });
    }
    return stored;
  }

  async put(key: string, bytes: Buffer) {
    const stored = this.storedKey(key);
    const prefix = this.ownership.storedPrefix;
    if (prefix && stored !== prefix && !stored.startsWith(`${prefix}/`)) {
      throw Object.assign(new Error("storage key is outside this run"), {
        name: "OutsideOwnership",
      });
    }
    if (!this.candidates.includes(key)) this.candidates.push(key);
    await this.inner.put(key, bytes);
  }

  get(key: string) {
    return this.inner.get(key);
  }

  async delete(key: string) {
    this.assertOwned(key);
    await this.inner.delete(key);
  }

  exists(key: string) {
    return this.inner.exists(key);
  }

  async deleteTracked(): Promise<StorageFailureRecord[]> {
    const failures: StorageFailureRecord[] = [];
    for (const key of this.candidates) {
      try {
        this.assertOwned(key);
        await this.inner.delete(key);
      } catch (error) {
        failures.push(describeStorageFailure(key, error));
      }
    }
    return failures;
  }
}
