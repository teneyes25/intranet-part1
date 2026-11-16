import "server-only";

import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis/client";
import { isDemoSeedEnabled, isProductionMode } from "@/lib/production/config";

export async function getActiveEmergencyNotice() {
  const now = new Date();
  return prisma.emergencyNotice.findFirst({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSystemOverview() {
  const [
    userCount,
    activeUsers,
    postCount,
    demoPostCount,
    approvalCount,
    aiChat24h,
    aiChat7d,
    errorLogs24h,
    usageEvents7d,
    dbSizeRow,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true, approvalStatus: "APPROVED" } }),
    prisma.post.count(),
    prisma.post.count({ where: { isDemo: true } }),
    prisma.approvalDocument.count(),
    prisma.auditLog.count({
      where: {
        action: "AI_CHAT",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "AI_CHAT",
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.systemErrorLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.usageMetric.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.$queryRaw<{ size: bigint }[]>`
      SELECT pg_database_size(current_database()) AS size
    `,
  ]);

  let redis: { connected: boolean; memoryHuman?: string; keys?: number } = {
    connected: false,
  };
  try {
    const r = getRedis();
    if (r) {
      if (r.status !== "ready") await r.connect();
      const info = await r.info("memory");
      const mem = info.match(/used_memory_human:(.+)/)?.[1]?.trim();
      const dbsize = await r.dbsize();
      redis = { connected: true, memoryHuman: mem, keys: dbsize };
    }
  } catch {
    redis = { connected: false };
  }

  const dbSizeBytes = Number(dbSizeRow[0]?.size ?? 0);

  return {
    mode: {
      production: isProductionMode(),
      demoSeed: isDemoSeedEnabled(),
    },
    counts: {
      users: userCount,
      activeUsers,
      posts: postCount,
      demoPosts: demoPostCount,
      approvals: approvalCount,
    },
    ai: {
      chatEvents24h: aiChat24h,
      chatEvents7d: aiChat7d,
    },
    monitoring: {
      errors24h: errorLogs24h,
      usageEvents7d,
    },
    database: {
      sizeBytes: dbSizeBytes,
      sizeHuman: formatBytes(dbSizeBytes),
    },
    redis,
    runtime: {
      uptimeSec: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV ?? "development",
      hostname: process.env.HOSTNAME ?? "unknown",
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export async function listRecentEmergencyNotices(limit = 10) {
  return prisma.emergencyNotice.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listRecentSystemErrors(limit = 10) {
  return prisma.systemErrorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
