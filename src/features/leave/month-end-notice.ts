import "server-only";

import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AI_AGENT_NAME } from "@/lib/ai/persona";
import { sanitizeRichText } from "@/lib/sanitize";
import { notifyUsers } from "@/features/notifications/service";
import {
  currentLeaveYear,
  ensureLeaveBalance,
  remainingDays,
} from "@/features/leave/queries";

const BOT_EMAIL = "maejongi@intranet.local";
const NOTICE_LOG_PREFIX = "leave-promote-notice";

function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

async function ensureMaejongBot() {
  return prisma.user.upsert({
    where: { email: BOT_EMAIL },
    update: { name: AI_AGENT_NAME },
    create: {
      email: BOT_EMAIL,
      name: AI_AGENT_NAME,
      role: Role.HEADQUARTER,
      approvalStatus: "APPROVED",
      passwordHash: "disabled-system-account",
    },
  });
}

/**
 * 매월 말일(KST) 연차 사용 촉진 공지를 공지사항에 자동 등록.
 * 글쓴이: 매종이
 */
export async function runMonthEndLeavePromoteNotice(opts?: {
  force?: boolean;
  now?: Date;
}) {
  const now = opts?.now ?? new Date();
  const { year, month, day } = kstParts(now);
  const last = lastDayOfMonth(year, month);
  if (!opts?.force && day !== last) {
    return { skipped: true as const, reason: "not_month_end", year, month, day };
  }

  const marker = `${NOTICE_LOG_PREFIX}:${year}-${String(month).padStart(2, "0")}`;
  const existing = await prisma.post.findFirst({
    where: {
      board: { key: "notices" },
      title: { contains: `${year}년 ${month}월 연차 사용 촉진` },
    },
    select: { id: true },
  });
  if (existing) {
    return {
      skipped: true as const,
      reason: "already_posted",
      year,
      month,
      postId: existing.id,
    };
  }

  const board = await prisma.board.findUnique({ where: { key: "notices" } });
  if (!board) {
    return { skipped: true as const, reason: "no_notices_board", year, month };
  }

  const bot = await ensureMaejongBot();
  const leaveYear = currentLeaveYear(now);
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      role: { in: ["ADMIN", "HEADQUARTER"] },
    },
    select: { id: true },
  });

  let totalRemaining = 0;
  for (const u of users) {
    const bal = await ensureLeaveBalance(u.id, leaveYear);
    totalRemaining += remainingDays(bal.accruedDays, bal.usedDays);
  }
  const avg =
    users.length > 0
      ? Math.round((totalRemaining / users.length) * 10) / 10
      : 0;

  const title = `[연차 촉진] ${year}년 ${month}월 연차 사용을 권장합니다`;
  const content = sanitizeRichText(`
    <p>안녕하세요, <strong>${AI_AGENT_NAME}</strong>입니다.</p>
    <p>${year}년 ${month}월 말일을 맞아 <strong>연차 사용을 촉진</strong>드립니다.</p>
    <ul>
      <li>잔여 연차는 「연차관리」 메뉴에서 확인할 수 있습니다.</li>
      <li>사용 신청은 기안문(전자결재)으로 진행해 주세요.</li>
      <li>이번 달 기준 본사 평균 잔여 연차(참고): 약 ${avg}일</li>
    </ul>
    <p>미사용 연차는 업무 공백·소진 부담으로 이어질 수 있으니, 계획적으로 사용해 주시기 바랍니다.</p>
    <p>문의: 인사업무 담당자</p>
    <p><em>본 공지는 매월 말일 자동 등록됩니다. (${marker})</em></p>
  `);

  const post = await prisma.post.create({
    data: {
      boardId: board.id,
      authorId: bot.id,
      title,
      content,
      category: board.categories.includes("인사") ? "인사" : null,
      isPinned: true,
    },
    select: { id: true },
  });

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      id: { not: bot.id },
    },
    select: { id: true },
  });
  await notifyUsers(
    recipients.map((u) => u.id),
    {
      type: "NOTICE",
      title: "연차 사용 촉진 공지",
      body: title,
      link: `/boards/notices/${post.id}`,
    },
  );

  return {
    skipped: false as const,
    year,
    month,
    postId: post.id,
    notified: recipients.length,
  };
}
