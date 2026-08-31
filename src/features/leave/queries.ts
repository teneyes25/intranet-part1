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

function roundLeaveDays(days: number) {
  return Math.round(days * 10) / 10;
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

/**
 * 승인된 연차 신청 일수 합계로 usedDays를 동기화합니다.
 * 인사 입력 발생일수(accruedDays)에서 잔여 = 발생 − 사용 으로 자동 반영됩니다.
 */
export async function syncLeaveUsedDaysFromApproved(
  userId: string,
  year = currentLeaveYear(),
) {
  const balance = await ensureLeaveBalance(userId, year);
  const approved = await prisma.leaveRequest.findMany({
    where: { userId, status: "APPROVED" },
    select: { days: true, startDate: true },
  });
  const used = roundLeaveDays(
    approved
      .filter((row) => currentLeaveYear(row.startDate) === year)
      .reduce((sum, row) => sum + row.days, 0),
  );

  if (used !== balance.usedDays) {
    return prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { usedDays: used },
    });
  }
  return balance;
}

export async function getMyLeaveSummary(userId: string) {
  const year = currentLeaveYear();
  const balance = await syncLeaveUsedDaysFromApproved(userId, year);
  const requests = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      approver: { select: { id: true, name: true } },
      approvalDocument: { select: { id: true, status: true } },
    },
  });
  return {
    year,
    accruedDays: balance.accruedDays,
    usedDays: balance.usedDays,
    accruedAt: balance.accruedAt,
    remainingDays: remainingDays(balance.accruedDays, balance.usedDays),
    requests,
  };
}

/** 인사/관리자: 전원 발생·사용 현황 */
export async function listLeaveBalancesForHr(year = currentLeaveYear()) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      role: { in: ["ADMIN", "HEADQUARTER"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      jobs: {
        select: { jobCategory: { select: { name: true } } },
      },
      leaveBalances: {
        where: { year },
        take: 1,
      },
    },
  });

  return Promise.all(
    users.map(async (u) => {
      const balance = await syncLeaveUsedDaysFromApproved(u.id, year);
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        jobs: u.jobs.map((j) => j.jobCategory.name),
        year,
        accruedDays: balance.accruedDays,
        usedDays: balance.usedDays,
        remainingDays: remainingDays(balance.accruedDays, balance.usedDays),
        accruedAt: balance.accruedAt,
      };
    }),
  );
}

/** 인사/관리자·본인: 사용 내역 (승인·대기·반려) */
export async function listLeaveUsageHistory(opts?: {
  userId?: string;
  take?: number;
}) {
  return prisma.leaveRequest.findMany({
    where: opts?.userId ? { userId: opts.userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: opts?.take ?? 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      approvalDocument: { select: { id: true, status: true } },
    },
  });
}

export async function listPendingLeaveRequests() {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      approvalDocument: { select: { id: true } },
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
