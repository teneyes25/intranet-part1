import "server-only";

import { prisma } from "@/lib/prisma";

export const DEFAULT_ACCRUED_DAYS = 15;

export function currentLeaveYear(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(now),
  );
}

export function remainingDays(accrued: number, used: number) {
  return Math.round((accrued - used) * 10) / 10;
}

/** 사용자·연도의 연차 잔여 확보 (없으면 기본 발생연차로 생성) */
export async function ensureLeaveBalance(
  userId: string,
  year = currentLeaveYear(),
) {
  return prisma.leaveBalance.upsert({
    where: { userId_year: { userId, year } },
    update: {},
    create: {
      userId,
      year,
      accruedDays: DEFAULT_ACCRUED_DAYS,
      usedDays: 0,
    },
  });
}

export async function getMyLeaveSummary(userId: string) {
  const year = currentLeaveYear();
  const balance = await ensureLeaveBalance(userId, year);
  const requests = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      approver: { select: { id: true, name: true } },
    },
  });
  return {
    year,
    accruedDays: balance.accruedDays,
    usedDays: balance.usedDays,
    remainingDays: remainingDays(balance.accruedDays, balance.usedDays),
    requests,
  };
}

export async function listPendingLeaveRequests() {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

/** 시작~종료 포함 달력 일수 */
export function calcLeaveDays(start: Date, end: Date) {
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  if (e < s) return 0;
  return Math.floor((e - s) / 86400000) + 1;
}
