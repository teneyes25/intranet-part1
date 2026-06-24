"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit/service";

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

  void writeAudit({ action: "USER_REJECT", userId, resource: userId, success: false });

  revalidatePath("/admin/users");
}
