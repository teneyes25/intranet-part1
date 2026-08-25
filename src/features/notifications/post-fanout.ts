import "server-only";

import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { canAccessBoard } from "@/lib/auth/access";
import { notifyUsers } from "@/features/notifications/service";
import {
  messagingStatusSummary,
  sendContactAlert,
} from "@/lib/messaging/contact-alert";
import { writeAudit } from "@/lib/audit/service";

/** 새 게시글 → 사이드바/벨 인앱 알림 + (공지+옵션 시) 연락처 문자 */
export async function fanoutNewPostNotifications(params: {
  boardKey: string;
  boardName: string;
  postId: string;
  title: string;
  authorId: string;
  authorName: string;
  /** 공지사항에서 연락처 알림 발송 요청 */
  sendContactNotify?: boolean;
}) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      id: { not: params.authorId },
    },
    select: { id: true, phone: true, role: true, name: true },
  });

  const recipients = users.filter((u) =>
    canAccessBoard(u.role as Role, params.boardKey),
  );

  if (recipients.length > 0) {
    await notifyUsers(
      recipients.map((u) => u.id),
      {
        type: "NOTICE",
        title: `새 글 · ${params.boardName}`,
        body: params.title,
        link: `/boards/${params.boardKey}/${params.postId}`,
      },
    );
  }

  if (params.boardKey !== "notices" || !params.sendContactNotify) {
    return { inApp: recipients.length, contactSent: 0, contactFailed: 0 };
  }

  const withPhone = recipients.filter((u) => u.phone);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  const link = `${baseUrl}/boards/${params.boardKey}/${params.postId}`;
  const text = `[공지] ${params.title}\n작성: ${params.authorName}\n${link || `/boards/${params.boardKey}/${params.postId}`}`;

  let contactSent = 0;
  let contactFailed = 0;
  for (const u of withPhone) {
    const r = await sendContactAlert(u.phone!, text);
    if (r.ok) contactSent += 1;
    else contactFailed += 1;
  }

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: params.authorId,
    resource: params.postId,
    detail: `notice_contact_notify channel=${messagingStatusSummary()} sent=${contactSent} failed=${contactFailed} phones=${withPhone.length} inApp=${recipients.length}`,
    success: contactFailed === 0,
  });

  return {
    inApp: recipients.length,
    contactSent,
    contactFailed,
    skippedNoPhone: recipients.length - withPhone.length,
  };
}
