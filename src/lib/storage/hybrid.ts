import "server-only";

import { randomUUID } from "node:crypto";

import {
  downloadFromFirebaseStorage,
  shouldUseFirebaseStorage,
  uploadToFirebaseStorage,
} from "@/lib/firebase/storage-server";

export interface HybridSaveInput {
  buffer: Buffer;
  contentType: string;
  filename: string;
  folder: "uploads" | "branding";
}

export interface HybridSaveResult {
  storageKey: string;
  size: number;
  mimeType: string;
}

/** Firebase Storage 우선, 실패 시 호출자가 로컬 저장 처리 */
export async function trySaveToFirebaseStorage(
  input: HybridSaveInput,
): Promise<HybridSaveResult | null> {
  if (!shouldUseFirebaseStorage()) return null;

  const ext = input.filename.includes(".")
    ? input.filename.slice(input.filename.lastIndexOf("."))
    : "";
  const objectPath = `${input.folder}/${randomUUID()}${ext}`;

  try {
    const storageKey = await uploadToFirebaseStorage(
      objectPath,
      input.buffer,
      input.contentType,
    );
    return {
      storageKey,
      size: input.buffer.length,
      mimeType: input.contentType,
    };
  } catch (e) {
    console.error("[hybrid-storage] Firebase 업로드 실패, 로컬 폴백:", e);
    return null;
  }
}

export async function readHybridStorageFile(storageKey: string): Promise<Buffer | null> {
  return downloadFromFirebaseStorage(storageKey);
}
