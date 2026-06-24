import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BRANDING_DIR = path.join(process.cwd(), "uploads", "branding");

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "video/mp4",
  "video/webm",
]);

export async function saveBrandingFile(
  file: File,
  kind: "logo" | "favicon" | "banner",
): Promise<{ storageKey: string; mediaType: string }> {
  if (!file.size || file.size > 15 * 1024 * 1024) {
    throw new Error("파일 크기는 15MB 이하여야 합니다.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("지원하지 않는 파일 형식입니다.");
  }

  await fs.mkdir(BRANDING_DIR, { recursive: true });
  const ext = path.extname(file.name) || (file.type.includes("video") ? ".mp4" : ".png");
  const storageKey = `${kind}-${randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(BRANDING_DIR, storageKey), buf);

  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  return { storageKey, mediaType };
}

export function resolveBrandingPath(storageKey: string): string {
  const safe = path.basename(storageKey);
  return path.join(BRANDING_DIR, safe);
}

export async function deleteBrandingFile(storageKey: string | null | undefined) {
  if (!storageKey) return;
  try {
    await fs.unlink(resolveBrandingPath(storageKey));
  } catch {
    /* ignore */
  }
}
