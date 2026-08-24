"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth/session";
import { notifyUsers } from "@/features/notifications/service";
import {
  calcLeaveDays,
  currentLeaveYear,
  ensureLeaveBalance,
  remainingDays,
} from "@/features/leave/queries";

export type LeaveActionState = { ok?: boolean; error?: string };

function parseDateOnly(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

export async function submitLeaveRequestAction(
  _prev: LeaveActionState,
  formData: FormData,
): Promise<LeaveActionState> {
  const user = await requireUser();
  const start = parseDateOnly(String(formData.get("startDate") ?? ""));
  const end = parseDateOnly(String(formData.get("endDate") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!start || !end) return { error: "시작일·종료일을 확인하세요." };
  const days = calcLeaveDays(start, end);
  if (days <= 0) return { error: "종료일은 시작일 이후여야 합니다." };

  const year = currentLeaveYear(start);
  const balance = await ensureLeaveBalance(user.id, year);
  const remaining = remainingDays(balance.accruedDays, balance.usedDays);
  if (days > remaining) {
    return { error: `잔여 연차(${remaining}일)를 초과합니다.` };
  }

  const pendingOverlap = await prisma.leaveRequest.count({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (pendingOverlap > 0) {
    return { error: "같은 기간에 이미 신청·승인된 연차가 있습니다." };
  }

  const created = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: "PENDING",
    },
  });

  const approvers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "HEADQUARTER"] },
      isActive: true,
      approvalStatus: "APPROVED",
      id: { not: user.id },
    },
    select: { id: true },
    take: 20,
  });
  if (approvers.length > 0) {
    await notifyUsers(
      approvers.map((a) => a.id),
      {
        type: "LEAVE_REQUEST",
        title: "연차 승인 요청",
        body: `${user.name}님이 ${days}일 연차를 신청했습니다.`,
        link: "/leave",
      },
    );
  }

  revalidatePath("/leave");
  void created;
  return { ok: true };
}

export async function cancelLeaveRequestAction(requestId: string) {
  const user = await requireUser();
  const req = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  if (!req || req.userId !== user.id) return { error: "신청을 찾을 수 없습니다." };
  if (req.status !== "PENDING") return { error: "대기 중인 신청만 취소할 수 있습니다." };

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/leave");
  return { ok: true };
}

export async function reviewLeaveRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
) {
  const reviewer = await requireRole(["ADMIN", "HEADQUARTER"]);
  const req = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!req) return { error: "신청을 찾을 수 없습니다." };
  if (req.status !== "PENDING") return { error: "이미 처리된 신청입니다." };
  if (req.userId === reviewer.id) {
    return { error: "본인 신청은 승인할 수 없습니다." };
  }

  if (decision === "APPROVED") {
    const year = currentLeaveYear(req.startDate);
    const balance = await ensureLeaveBalance(req.userId, year);
    const remaining = remainingDays(balance.accruedDays, balance.usedDays);
    if (req.days > remaining) {
      return { error: `잔여 연차 부족 (${remaining}일)` };
    }

    await prisma.$transaction([
      prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approverId: reviewer.id,
          reviewedAt: new Date(),
          reviewNote: note?.trim() || null,
        },
      }),
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { usedDays: balance.usedDays + req.days },
      }),
    ]);
  } else {
    await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approverId: reviewer.id,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    });
  }

  await notifyUsers([req.userId], {
    type: "LEAVE_RESULT",
    title: decision === "APPROVED" ? "연차 승인" : "연차 반려",
    body:
      decision === "APPROVED"
        ? `${req.days}일 연차 사용이 승인되었습니다.`
        : `연차 신청이 반려되었습니다.${note ? ` (${note})` : ""}`,
    link: "/leave",
  });

  revalidatePath("/leave");
  return { ok: true };
}

/** 관리자: 발생 연차 조정 */
export async function setAccruedLeaveAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const accrued = Number(formData.get("accruedDays"));
  if (!userId || !Number.isFinite(accrued) || accrued < 0) {
    return { error: "입력값을 확인하세요." };
  }
  const year = currentLeaveYear();
  const balance = await ensureLeaveBalance(userId, year);
  if (accrued < balance.usedDays) {
    return { error: `사용 연차(${balance.usedDays}일)보다 작을 수 없습니다.` };
  }
  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: { accruedDays: accrued },
  });
  revalidatePath("/leave");
  revalidatePath("/admin/users");
  return { ok: true };
}
