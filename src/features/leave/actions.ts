"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeaveType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth/session";
import { isHrStaff } from "@/features/jobs/service";
import {
  currentLeaveYear,
  ensureLeaveBalance,
} from "@/features/leave/queries";
import { submitLeaveAsApproval } from "@/features/leave/approval-bridge";

export type LeaveActionState = { ok?: boolean; error?: string; approvalId?: string };

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
  const sessionUser = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, phone: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  const leaveType = (String(formData.get("leaveType") ?? "FULL") === "HALF"
    ? "HALF"
    : "FULL") as LeaveType;
  const start = parseDateOnly(String(formData.get("startDate") ?? ""));
  let end = parseDateOnly(String(formData.get("endDate") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const emergencyContact =
    String(formData.get("emergencyContact") ?? "").trim() ||
    dbUser.phone ||
    null;

  if (!start) return { error: "시작일을 확인하세요." };
  if (leaveType === "HALF") end = start;
  if (!end) return { error: "종료일을 확인하세요." };

  try {
    const result = await submitLeaveAsApproval({
      userId: dbUser.id,
      userName: dbUser.name,
      phone: dbUser.phone,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      emergencyContact,
    });
    revalidatePath("/leave");
    revalidatePath("/approval");
    redirect(`/approval/${result.approvalId}`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "신청 실패" };
  }
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
  if (req.approvalDocumentId) {
    await prisma.approvalDocument.update({
      where: { id: req.approvalDocumentId },
      data: { status: "REJECTED" },
    });
  }
  revalidatePath("/leave");
  return { ok: true };
}

/** 인사/관리자: 발생 연차·발생 시점 입력 */
export async function setAccruedLeaveAction(formData: FormData) {
  const actor = await requireUser();
  const admin = actor.role === "ADMIN";
  const hr = await isHrStaff(actor.id);
  if (!admin && !hr) return { error: "인사 담당자 또는 관리자만 가능합니다." };

  const userId = String(formData.get("userId") ?? "");
  const accrued = Number(formData.get("accruedDays"));
  const yearRaw = Number(formData.get("year"));
  const year = Number.isFinite(yearRaw) && yearRaw > 2000 ? yearRaw : currentLeaveYear();
  const accruedAtRaw = String(formData.get("accruedAt") ?? "").trim();
  const accruedAt = accruedAtRaw ? parseDateOnly(accruedAtRaw) : null;

  if (!userId || !Number.isFinite(accrued) || accrued < 0) {
    return { error: "입력값을 확인하세요." };
  }
  const balance = await ensureLeaveBalance(userId, year);
  if (accrued < balance.usedDays) {
    return { error: `사용 연차(${balance.usedDays}일)보다 작을 수 없습니다.` };
  }
  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: {
      accruedDays: accrued,
      ...(accruedAt ? { accruedAt } : {}),
    },
  });
  revalidatePath("/leave");
  revalidatePath("/admin/users");
  return { ok: true };
}

/** @deprecated 결재 기안 흐름으로 대체 — 하위 호환 */
export async function reviewLeaveRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
) {
  await requireRole(["ADMIN"]);
  const req = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") return { error: "처리할 수 없습니다." };
  if (req.approvalDocumentId) {
    return { error: "전자결재 문서에서 승인·반려하세요." };
  }
  void decision;
  void note;
  return { error: "레거시 승인은 더 이상 지원하지 않습니다." };
}
