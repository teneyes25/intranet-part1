import "server-only";

/** 허용 확장자 (소문자, 점 포함) */
export const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".zip",
  ".hwp",
]);

/** MIME 화이트리스트 */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-hwp",
  "application/octet-stream",
]);

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUploadFile(file: File): UploadValidationResult {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: `허용되지 않는 파일 형식입니다: ${ext || "(확장자 없음)"}`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: `허용되지 않는 MIME 타입입니다: ${file.type}`,
    };
  }

  return { ok: true };
}

/**
 * ClamAV 연동 준비 (CLAMAV_HOST 설정 시 활성화)
 * docker-compose에 clamav 서비스 추가 후 CLAMAV_HOST=clamav:3310
 */
export async function scanFileIfEnabled(buffer: Buffer): Promise<UploadValidationResult> {
  void buffer;
  const host = process.env.CLAMAV_HOST;
  if (!host) return { ok: true };

  // TODO: @clamav/clamdjs 또는 TCP INSTREAM 프로토콜 연동
  // 현재는 인프라 준비 단계 — 호스트 설정 시 로그만 남김
  console.info("[upload] ClamAV scan queued (host=%s)", host);
  return { ok: true };
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/") && mime !== "image/svg+xml";
}
