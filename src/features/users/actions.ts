"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";

export type AdminUserActionResult = {
  ok?: boolean;
  error?: string;
  tempPassword?: string;
};

export async function approveUserAction(userId: string) {
  await requireRole(["ADMIN"]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "APPROVED",
      isActive: true,
    },
  });

  void writeAudit({ action: "USER_APPROVE", userId, resource: userId });

  revalidatePath("/admin/users");
}

export async function rejectUserAction(userId: string) {
  await requireRole(["ADMIN"]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      approvalStatus: "REJECTED",
      isActive: false,
    },
  });

  void writeAudit({
    action: "USER_REJECT",
    userId,
    resource: userId,
    success: false,
  });

  revalidatePath("/admin/users");
}

/** 활성/비활성 토글 (로그인 차단) */
export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<AdminUserActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (admin.id === userId && !isActive) {
    return { error: "본인 계정은 비활성화할 수 없습니다." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  if (!isActive && target.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, approvalStatus: "APPROVED" },
    });
    if (activeAdmins <= 1) {
      return { error: "마지막 활성 관리자는 비활성화할 수 없습니다." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  void writeAudit({
    action: isActive ? "USER_APPROVE" : "USER_REJECT",
    userId: admin.id,
    resource: userId,
    detail: `toggle_active=${isActive} target=${target.email}`,
    success: true,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * 비밀번호 초기화 — 임시 비밀번호 발급 + 다음 로그인 시 변경 강제
 */
export async function resetUserPasswordAction(
  userId: string,
): Promise<AdminUserActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, approvalStatus: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (target.approvalStatus !== "APPROVED") {
    return { error: "승인된 사용자만 비밀번호를 초기화할 수 있습니다." };
  }

  const tempPassword = `Tmp-${randomBytes(4).toString("hex")}A1`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: null,
    },
  });

  void writeAudit({
    action: "PASSWORD_CHANGE",
    userId: admin.id,
    resource: userId,
    detail: `admin_reset target=${target.email}`,
    success: true,
  });

  revalidatePath("/admin/users");
  return { ok: true, tempPassword };
}

/**
 * 강제 탈퇴(소프트) — 로그인 불가, 반려 상태. 게시글 이력은 유지.
 */
export async function forceWithdrawUserAction(
  userId: string,
): Promise<AdminUserActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (admin.id === userId) {
    return { error: "본인 계정은 강제 탈퇴할 수 없습니다." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  if (target.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, approvalStatus: "APPROVED" },
    });
    if (activeAdmins <= 1) {
      return { error: "마지막 활성 관리자는 강제 탈퇴할 수 없습니다." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      approvalStatus: "REJECTED",
      mustChangePassword: false,
    },
  });

  void writeAudit({
    action: "USER_REJECT",
    userId: admin.id,
    resource: userId,
    detail: `force_withdraw target=${target.email}`,
    success: true,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * 계정 완전 삭제 — 게시글/결재 이력이 없을 때만
 */
export async function forceDeleteUserAction(
  userId: string,
): Promise<AdminUserActionResult> {
  const admin = await requireRole(["ADMIN"]);
  if (admin.id === userId) {
    return { error: "본인 계정은 삭제할 수 없습니다." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      _count: {
        select: {
          posts: true,
          comments: true,
          approvalDrafts: true,
          approvalSteps: true,
        },
      },
    },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "마지막 관리자 계정은 삭제할 수 없습니다." };
    }
  }

  const blocked =
    target._count.posts +
    target._count.comments +
    target._count.approvalDrafts +
    target._count.approvalSteps;
  if (blocked > 0) {
    return {
      error:
        "게시글·댓글·결재 이력이 있어 완전 삭제할 수 없습니다. 강제 탈퇴(비활성)를 사용하세요.",
    };
  }

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.userPreference.deleteMany({ where: { userId } }),
    prisma.postMailItem.deleteMany({ where: { userId } }),
    prisma.postLabel.deleteMany({ where: { userId } }),
    prisma.postFolder.deleteMany({ where: { userId } }),
    prisma.downloadLog.deleteMany({ where: { userId } }),
    prisma.aiConversation.deleteMany({ where: { userId } }),
    prisma.pilotFeedback.deleteMany({ where: { userId } }),
    prisma.pilotGroupMember.deleteMany({ where: { userId } }),
    prisma.rolloutFeedback.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  void writeAudit({
    action: "USER_REJECT",
    userId: admin.id,
    resource: userId,
    detail: `force_delete target=${target.email}`,
    success: true,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

/** 관리자: 사용자 휴대폰 번호 저장 */
export async function updateUserPhoneAction(
  userId: string,
  phoneRaw: string,
): Promise<AdminUserActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const { normalizePhone } = await import("@/lib/phone");
  const trimmed = String(phoneRaw ?? "").trim();
  const phone = trimmed === "" ? null : normalizePhone(trimmed);
  if (trimmed && !phone) {
    return { error: "올바른 휴대폰 번호를 입력하세요. (예: 010-1234-5678)" };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  void writeAudit({
    action: "USER_APPROVE",
    userId: admin.id,
    resource: userId,
    detail: `phone_update phone=${phone ?? "cleared"}`,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
