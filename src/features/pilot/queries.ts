import "server-only";

import { prisma } from "@/lib/prisma";
import { isPilotModeEnv } from "@/lib/pilot/config";
import { getPilotSettings, isPilotModeActive, listPilotGroups } from "@/features/pilot/pilot-service";
import { getFeedbackStats, listFeedbacks } from "@/features/pilot/feedback-service";

export async function getPilotMonitoringData() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [settings, feedbackStats, feedbacks, errors, usageByEvent, dailyActive] =
    await Promise.all([
      getPilotSettings(),
      getFeedbackStats(),
      listFeedbacks(30),
      prisma.systemErrorLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.usageMetric.groupBy({
        by: ["event"],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
      prisma.usageMetric.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, userId: { not: null } },
        _count: { id: true },
      }),
    ]);

  return {
    pilotModeEnv: isPilotModeEnv(),
    settings,
    isActive: isPilotModeActive(settings),
    feedbackStats,
    feedbacks,
    errors,
    usageByEvent: usageByEvent.map((u) => ({
      event: u.event,
      count: u._count.id,
    })),
    dailyActiveUsers: dailyActive.length,
    totalEvents: usageByEvent.reduce((s, u) => s + u._count.id, 0),
  };
}

export async function getPilotAdminPageData() {
  const [groups, monitoring, users] = await Promise.all([
    listPilotGroups(),
    getPilotMonitoringData(),
    prisma.user.findMany({
      where: { isActive: true, approvalStatus: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);
  return { groups, monitoring, users };
}
