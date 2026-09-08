import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import sharp from "sharp";

import { MAX_FILE_SIZE, MAX_FILES } from "@/features/board/constants";
import {
  validateUploadFile,
  scanFileIfEnabled,
  isImageMime,
} from "@/lib/security/upload-policy";
import { writeAudit } from "@/lib/audit/service";

export { MAX_FILE_SIZE, MAX_FILES };

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 82;

export interface SavedFile {
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
}

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

async function compressImageBuffer(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const pipeline = sharp(buffer).rotate().resize({
    width: IMAGE_MAX_WIDTH,
    withoutEnlargement: true,
  });

  if (mime === "image/png") {
    const out = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    return { buffer: out, mime: "image/png", ext: ".png" };
  }
  if (mime === "image/webp") {
    const out = await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer();
    return { buffer: out, mime: "image/webp", ext: ".webp" };
  }
  const out = await pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer();
  return { buffer: out, mime: "image/jpeg", ext: ".jpg" };
}

export async function saveUploadedFile(
  file: File,
  auditContext?: { userId?: string; ip?: string | null },
): Promise<SavedFile> {
  const validation = validateUploadFile(file);
  if (!validation.ok) {
    throw new Error(validation.error ?? "파일 검증 실패");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `"${file.name}" 파일이 너무 큽니다. (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    );
  }

  await ensureUploadDir();

  const mime = file.type || "application/octet-stream";
  let storageKey: string;
  let finalMime = mime;
  let finalSize = file.size;

  if (isImageMime(mime)) {
    const raw = Buffer.from(await file.arrayBuffer());
    const scan = await scanFileIfEnabled(raw);
    if (!scan.ok) throw new Error(scan.error ?? "바이러스 검사 실패");

    const compressed = await compressImageBuffer(raw, mime);
    storageKey = `${randomUUID()}${compressed.ext}`;
    const target = path.join(UPLOAD_DIR, storageKey);
    await writeFile(target, compressed.buffer);
    finalMime = compressed.mime;
    finalSize = compressed.buffer.length;
  } else {
    storageKey = `${randomUUID()}${safeExt(file.name)}`;
    const target = path.join(UPLOAD_DIR, storageKey);

    const nodeStream = Readable.fromWeb(
      file.stream() as Parameters<typeof Readable.fromWeb>[0],
    );
    await pipeline(nodeStream, createWriteStream(target));

    const saved = await readFile(target);
    const scan = await scanFileIfEnabled(saved);
    if (!scan.ok) {
      await unlink(target).catch(() => {});
      throw new Error(scan.error ?? "바이러스 검사 실패");
    }
    finalSize = saved.length;
  }

  if (auditContext?.userId) {
    void writeAudit({
      action: "FILE_UPLOAD",
      userId: auditContext.userId,
      ip: auditContext.ip,
      resource: storageKey,
      detail: file.name,
    });
  }

  return {
    filename: file.name,
    storageKey,
    mimeType: finalMime,
    size: finalSize,
  };
}

export async function savePngBuffer(
  buffer: Buffer,
  filename: string,
  auditContext?: { userId?: string },
): Promise<SavedFile> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("이미지가 너무 큽니다. (최대 10MB)");
  }
  await ensureUploadDir();
  const storageKey = `${randomUUID()}.png`;
  await writeFile(path.join(UPLOAD_DIR, storageKey), buffer);
  if (auditContext?.userId) {
    void writeAudit({
      action: "FILE_UPLOAD",
      userId: auditContext.userId,
      resource: storageKey,
      detail: filename,
    });
  }
  return {
    filename,
    storageKey,
    mimeType: "image/png",
    size: buffer.length,
  };
}

export async function deleteStoredFile(storageKey: string) {
  try {
    await unlink(path.join(UPLOAD_DIR, storageKey));
  } catch {
    /* ignore */
  }
}

export function resolveStoredFilePath(storageKey: string) {
  const safe = path.basename(storageKey);
  return path.join(UPLOAD_DIR, safe);
}

export async function storedFileExists(storageKey: string) {
  try {
    await stat(resolveStoredFilePath(storageKey));
    return true;
  } catch {
    return false;
  }
}
