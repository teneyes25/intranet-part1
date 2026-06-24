import "server-only";

import { prisma } from "@/lib/prisma";

export async function getRolloutDashboard() {
  const [total, active, rolloutActive, groups, recentLogins, feedbacks] =
    await Promise.all([
      prisma.dealer.count(),
      prisma.dealer.count({ where: { isActive: true } }),
      prisma.dealer.count({ where: { rolloutActive: true, isActive: true } }),
      prisma.rolloutGroup.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          dealers: {
            select: {
              id: true,
              code: true,
              name: true,
              rolloutActive: true,
              isActive: true,
              _count: { select: { users: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: "LOGIN_SUCCESS",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.rolloutFeedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
          dealer: { select: { name: true, code: true } },
        },
      }),
    ]);

  const dealerUsers = await prisma.user.count({
    where: { role: "DEALER", isActive: true, approvalStatus: "APPROVED" },
  });

  const rolloutUsers = await prisma.user.count({
    where: {
      role: "DEALER",
      isActive: true,
      approvalStatus: "APPROVED",
      dealer: { rolloutActive: true, isActive: true },
    },
  });

  return {
    stats: {
      totalDealers: total,
      activeDealers: active,
      rolloutActiveDealers: rolloutActive,
      progressPct: total > 0 ? Math.round((rolloutActive / total) * 100) : 0,
      dealerUsers,
      rolloutUsers,
      logins7d: recentLogins,
    },
    groups,
    feedbacks,
  };
}

export async function submitRolloutFeedback(data: {
  userId: string;
  dealerId: string | null;
  category: string;
  rating: number;
  message: string;
}) {
  return prisma.rolloutFeedback.create({ data });
}
