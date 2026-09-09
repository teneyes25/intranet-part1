import "server-only";

import cron from "node-cron";

import {
  ATTACHMENT_RETENTION_DAYS,
} from "@/features/board/constants";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/uploads";

export function attachmentCutoff(now = new Date()) {
  return new Date(
    now.getTime() - ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** 1년 경과 게시글·기안 첨부 파일 삭제 */
export async function purgeExpiredAttachments() {
  const cutoff = attachmentCutoff();

  const boardFiles = await prisma.attachment.findMany({
    where: { createdAt: { lt: cutoff } },
    select: {
      id: true,
      storageKey: true,
      versions: { select: { storageKey: true } },
    },
  });
  const approvalFiles = await prisma.approvalAttachment.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, storageKey: true },
  });

  const keys = [
    ...boardFiles.flatMap((a) => [
      a.storageKey,
      ...a.versions.map((v) => v.storageKey),
    ]),
    ...approvalFiles.map((a) => a.storageKey),
  ];
  await Promise.all(keys.map((k) => deleteStoredFile(k)));

  if (boardFiles.length) {
    await prisma.attachment.deleteMany({
      where: { id: { in: boardFiles.map((a) => a.id) } },
    });
  }
  if (approvalFiles.length) {
    await prisma.approvalAttachment.deleteMany({
      where: { id: { in: approvalFiles.map((a) => a.id) } },
    });
  }

  return {
    board: boardFiles.length,
    approval: approvalFiles.length,
  };
}

const g = globalThis as unknown as { attachmentRetentionCronStarted?: boolean };

/** 매일 03:40 KST — 1년 지난 첨부 삭제 */
export function startAttachmentRetentionCron() {
  if (g.attachmentRetentionCronStarted) return;
  g.attachmentRetentionCronStarted = true;
  cron.schedule(
    "40 3 * * *",
    () => {
      void purgeExpiredAttachments()
        .then((r) => {
          if (r.board + r.approval > 0) {
            console.log(
              `[attachments] retention purged board=${r.board} approval=${r.approval}`,
            );
          }
        })
        .catch((e) => console.error("[attachments] retention failed:", e));
    },
    { timezone: "Asia/Seoul" },
  );
  console.log(
    "[attachments] retention cron registered (03:40 Asia/Seoul, 365d)",
  );
}
