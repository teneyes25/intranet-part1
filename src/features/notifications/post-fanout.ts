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
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone";

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  /** 문자 본문에 넣을 내용(HTML 가능) */
  contentHtml?: string | null;
  /** 발신 번호(공란이면 작성자 휴대폰) */
  senderPhone?: string | null;
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

  return sendNoticeContactSms({
    postId: params.postId,
    boardKey: params.boardKey,
    title: params.title,
    authorId: params.authorId,
    authorName: params.authorName,
    contentHtml: params.contentHtml,
    senderPhone: params.senderPhone,
    recipients: recipients.map((u) => ({ id: u.id, phone: u.phone })),
    inApp: recipients.length,
  });
}

/** 등록 후 공지 SMS 발송 (작성자 선택) */
export async function sendNoticeContactSms(params: {
  postId: string;
  boardKey: string;
  title: string;
  authorId: string;
  authorName: string;
  contentHtml?: string | null;
  senderPhone?: string | null;
  recipients?: { id: string; phone: string | null }[];
  inApp?: number;
}) {
  let recipients = params.recipients;
  if (!recipients) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        approvalStatus: "APPROVED",
        id: { not: params.authorId },
      },
      select: { id: true, phone: true, role: true },
    });
    recipients = users
      .filter((u) => canAccessBoard(u.role as Role, params.boardKey))
      .map((u) => ({ id: u.id, phone: u.phone }));
  }

  const author = await prisma.user.findUnique({
    where: { id: params.authorId },
    select: { phone: true },
  });
  const sender =
    normalizePhone(params.senderPhone ?? "") ||
    normalizePhone(author?.phone ?? "") ||
    null;

  const withPhone = recipients.filter((u) => u.phone);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  const link = `${baseUrl}/boards/${params.boardKey}/${params.postId}`;
  const bodyText = params.contentHtml
    ? stripHtml(params.contentHtml).slice(0, 400)
    : "";
  const senderLabel = sender ? formatPhoneDisplay(sender) : params.authorName;
  const text = [
    `[공지] ${params.title}`,
    bodyText,
    `작성: ${params.authorName}`,
    `발신: ${senderLabel}`,
    link || `/boards/${params.boardKey}/${params.postId}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);

  let contactSent = 0;
  let contactFailed = 0;
  for (const u of withPhone) {
    const r = await sendContactAlert(u.phone!, text, { from: sender });
    if (r.ok) contactSent += 1;
    else contactFailed += 1;
  }

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: params.authorId,
    resource: params.postId,
    detail: `notice_contact_notify channel=${messagingStatusSummary()} sent=${contactSent} failed=${contactFailed} phones=${withPhone.length} from=${sender ?? "-"} inApp=${params.inApp ?? "-"}`,
    success: contactFailed === 0,
  });

  return {
    inApp: params.inApp ?? 0,
    contactSent,
    contactFailed,
    skippedNoPhone: recipients.length - withPhone.length,
  };
}
