import "server-only";

import { getFirebaseAdminStorage } from "@/lib/firebase/admin";
import {
  FIREBASE_STORAGE_PREFIX,
  type StorageBackend,
} from "@/lib/firebase/types";
import { getFirebaseFeatureFlags } from "@/lib/firebase/config";

export function isFirebaseStorageKey(storageKey: string): boolean {
  return storageKey.startsWith(FIREBASE_STORAGE_PREFIX);
}

export function toFirebaseObjectPath(storageKey: string): string {
  return storageKey.slice(FIREBASE_STORAGE_PREFIX.length);
}

export function toFirebaseStorageKey(objectPath: string): string {
  return `${FIREBASE_STORAGE_PREFIX}${objectPath}`;
}

export async function uploadToFirebaseStorage(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const storage = getFirebaseAdminStorage();
  if (!storage) throw new Error("Firebase Storage 미설정");

  const bucket = storage.bucket();
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });
  return toFirebaseStorageKey(objectPath);
}

export async function downloadFromFirebaseStorage(storageKey: string): Promise<Buffer | null> {
  if (!isFirebaseStorageKey(storageKey)) return null;
  const storage = getFirebaseAdminStorage();
  if (!storage) return null;

  try {
    const [buf] = await storage.bucket().file(toFirebaseObjectPath(storageKey)).download();
    return buf;
  } catch {
    return null;
  }
}

export async function getFirebaseSignedUrl(
  storageKey: string,
  expiresMinutes = 60,
): Promise<string | null> {
  if (!isFirebaseStorageKey(storageKey)) return null;
  const storage = getFirebaseAdminStorage();
  if (!storage) return null;

  try {
    const [url] = await storage
      .bucket()
      .file(toFirebaseObjectPath(storageKey))
      .getSignedUrl({
        action: "read",
        expires: Date.now() + expiresMinutes * 60 * 1000,
      });
    return url;
  } catch {
    return null;
  }
}

export async function deleteFromFirebaseStorage(storageKey: string): Promise<void> {
  if (!isFirebaseStorageKey(storageKey)) return;
  const storage = getFirebaseAdminStorage();
  if (!storage) return;
  try {
    await storage.bucket().file(toFirebaseObjectPath(storageKey)).delete();
  } catch {
    /* ignore */
  }
}

export function shouldUseFirebaseStorage(): boolean {
  return getFirebaseFeatureFlags().storage;
}

export function resolveStorageBackend(storageKey: string): StorageBackend {
  return isFirebaseStorageKey(storageKey) ? "firebase" : "local";
}
