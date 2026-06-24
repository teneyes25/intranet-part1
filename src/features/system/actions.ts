"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";
import { notifyUsers } from "@/features/notifications/service";

const emergencySchema = z.object({
  title: z.string().min(1, "제목을 입력하세요.").max(200),
  body: z.string().min(1, "내용을 입력하세요.").max(2000),
  expiresHours: z.coerce.number().min(0).max(168).optional(),
});

export type EmergencyNoticeState = {
  ok?: boolean;
  error?: string;
  recipientCount?: number;
};

export async function sendEmergencyNoticeAction(
  _prev: EmergencyNoticeState,
  formData: FormData,
): Promise<EmergencyNoticeState> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = emergencySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    expiresHours: formData.get("expiresHours") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "입력값을 확인하세요." };
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, approvalStatus: "APPROVED" },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const expiresAt =
    parsed.data.expiresHours && parsed.data.expiresHours > 0
      ? new Date(Date.now() + parsed.data.expiresHours * 60 * 60 * 1000)
      : null;

  await prisma.emergencyNotice.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  await prisma.emergencyNotice.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      sentById: admin.id,
      recipientCount: userIds.length,
      expiresAt,
    },
  });

  await notifyUsers(userIds, {
    type: "EMERGENCY" as NotificationType,
    title: parsed.data.title,
    body: parsed.data.body,
    link: "/dashboard",
  });

  void writeAudit({
    action: "EMERGENCY_NOTICE",
    userId: admin.id,
    detail: `recipients=${userIds.length}`,
    success: true,
  });

  revalidatePath("/admin/system");
  revalidatePath("/dashboard");

  return { ok: true, recipientCount: userIds.length };
}

export async function deactivateEmergencyNoticeAction(noticeId: string) {
  await requireRole(["ADMIN"]);
  await prisma.emergencyNotice.update({
    where: { id: noticeId },
    data: { isActive: false },
  });
  revalidatePath("/admin/system");
  revalidatePath("/dashboard");
}

export async function purgeDemoDataAction() {
  await requireRole(["ADMIN"]);

  const [posts, approvals] = await prisma.$transaction([
    prisma.post.deleteMany({ where: { isDemo: true } }),
    prisma.approvalDocument.deleteMany({ where: { isDemo: true } }),
  ]);

  void writeAudit({
    action: "SITE_CUSTOMIZE",
    detail: `purge_demo posts=${posts.count} approvals=${approvals.count}`,
    success: true,
  });

  revalidatePath("/admin/system");
  revalidatePath("/dashboard");
  revalidatePath("/boards/notices");

  return { posts: posts.count, approvals: approvals.count };
}

export async function forcePasswordResetAction(userId: string) {
  await requireRole(["ADMIN"]);

  await prisma.user.update({
    where: { id: userId },
    data: { mustChangePassword: true },
  });

  void writeAudit({
    action: "PASSWORD_CHANGE",
    resource: userId,
    detail: "admin_force_reset",
    success: true,
  });

  revalidatePath("/admin/users");
}
