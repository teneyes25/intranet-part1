import "server-only";

import { Prisma, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { AI_AGENT_NAME } from "@/lib/ai/persona";
import { sanitizeRichText } from "@/lib/sanitize";
import { notifyUsers } from "@/features/notifications/service";
import {
  currentLeaveYear,
  remainingDays,
  syncLeaveUsedDaysFromApproved,
} from "@/features/leave/queries";

const BOT_EMAIL = "maejongi@intranet.local";
const NOTICE_LOG_PREFIX = "leave-promote-notice";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

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

function promoteTitle(year: number, month: number) {
  return `[연차 촉진] ${year}년 ${month}월 연차 사용을 권장합니다`;
}

function promoteMarker(year: number, month: number) {
  return `${NOTICE_LOG_PREFIX}:${year}-${String(month).padStart(2, "0")}`;
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

async function findExistingPromotePost(year: number, month: number) {
  const title = promoteTitle(year, month);
  const marker = promoteMarker(year, month);
  return prisma.post.findFirst({
    where: {
      board: { key: "notices" },
      OR: [
        { title },
        { title: { contains: `${year}년 ${month}월 연차 사용` } },
        { content: { contains: marker } },
      ],
    },
    select: { id: true },
  });
}

/** 연·월당 1회 등록 클레임. true면 이 프로세스가 공지 작성 권한을 가짐. */
async function claimPromoteMonth(year: number, month: number) {
  try {
    await prisma.leavePromoteNoticeLog.create({
      data: { year, month },
    });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

async function releasePromoteMonth(year: number, month: number) {
  await prisma.leavePromoteNoticeLog
    .delete({ where: { year_month: { year, month } } })
    .catch(() => undefined);
}

/**
 * 매월 말일(KST) 연차 사용 촉진 공지를 공지사항에 자동 등록 (연·월당 1회).
 * 글쓴이: 매종이. cron + 관리자 로그인 동시 트리거에도 중복 등록되지 않음.
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

  const existing = await findExistingPromotePost(year, month);
  if (existing) {
    await prisma.leavePromoteNoticeLog
      .upsert({
        where: { year_month: { year, month } },
        create: { year, month, postId: existing.id },
        update: { postId: existing.id },
      })
      .catch(() => undefined);
    return {
      skipped: true as const,
      reason: "already_posted",
      year,
      month,
      postId: existing.id,
    };
  }

  const claimed = await claimPromoteMonth(year, month);
  if (!claimed) {
    const raced = await findExistingPromotePost(year, month);
    if (raced) {
      return {
        skipped: true as const,
        reason: "already_posted",
        year,
        month,
        postId: raced.id,
      };
    }
    return {
      skipped: true as const,
      reason: "in_progress",
      year,
      month,
    };
  }

  try {
    const board = await prisma.board.findUnique({ where: { key: "notices" } });
    if (!board) {
      await releasePromoteMonth(year, month);
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
      const bal = await syncLeaveUsedDaysFromApproved(u.id, leaveYear);
      totalRemaining += remainingDays(bal.accruedDays, bal.usedDays);
    }
    const avg =
      users.length > 0
        ? Math.round((totalRemaining / users.length) * 10) / 10
        : 0;

    const marker = promoteMarker(year, month);
    const title = promoteTitle(year, month);
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

    await prisma.leavePromoteNoticeLog.update({
      where: { year_month: { year, month } },
      data: { postId: post.id },
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
  } catch (error) {
    await releasePromoteMonth(year, month);
    throw error;
  }
}

/** @deprecated use runMonthEndLeavePromoteNotice */
export async function createMonthEndLeavePromoteNotice(now = new Date()) {
  return runMonthEndLeavePromoteNotice({ now });
}
