/** 파일당 최대 크기 (100MB) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** 게시글당 최대 첨부 수 */
export const MAX_FILES = 15;

/** 첨부 보관·다운로드 기간 (1년) */
export const ATTACHMENT_RETENTION_DAYS = 365;

export function attachmentExpiresAt(createdAt: Date) {
  return new Date(
    createdAt.getTime() + ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function isAttachmentExpired(createdAt: Date, now = new Date()) {
  return now.getTime() >= attachmentExpiresAt(createdAt).getTime();
}
