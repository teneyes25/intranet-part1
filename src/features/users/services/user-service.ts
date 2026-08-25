import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * 사용자 목록 조회 (관리자 전용 화면에서 사용).
 */
export function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      approvalStatus: true,
      dealer: { select: { name: true, code: true } },
      createdAt: true,
    },
  });
}

export type UserListItem = Awaited<ReturnType<typeof listUsers>>[number];
