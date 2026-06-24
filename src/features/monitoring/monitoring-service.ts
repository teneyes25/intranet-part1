import "server-only";

import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis/client";
import { getSystemOverview } from "@/features/system/system-service";

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export async function getMonitoringMetrics() {
  const now = new Date();
  const since15m = new Date(now.getTime() - ONLINE_WINDOW_MS);
  const since1h = new Date(now.getTime() - 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    overview,
    onlineUsers,
    logins1h,
    logins24h,
    aiChat1h,
    aiChat24h,
    errors1h,
    errors24h,
    totalRequests24h,
    orders24h,
    hourlyLogins,
  ] = await Promise.all([
    getSystemOverview(),
    prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        action: "LOGIN_SUCCESS",
        createdAt: { gte: since15m },
        userId: { not: null },
      },
    }),
    prisma.auditLog.count({
      where: { action: "LOGIN_SUCCESS", createdAt: { gte: since1h } },
    }),
    prisma.auditLog.count({
      where: { action: "LOGIN_SUCCESS", createdAt: { gte: since24h } },
    }),
    prisma.auditLog.count({
      where: { action: "AI_CHAT", createdAt: { gte: since1h } },
    }),
    prisma.auditLog.count({
      where: { action: "AI_CHAT", createdAt: { gte: since24h } },
    }),
    prisma.systemErrorLog.count({ where: { createdAt: { gte: since1h } } }),
    prisma.systemErrorLog.count({ where: { createdAt: { gte: since24h } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: since24h } } }),
    prisma.order.count({ where: { createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.auditLog.findMany({
      where: { action: "LOGIN_SUCCESS", createdAt: { gte: since24h } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  let redisLatencyMs: number | null = null;
  try {
    const r = getRedis();
    if (r) {
      if (r.status !== "ready") await r.connect();
      const t0 = Date.now();
      await r.ping();
      redisLatencyMs = Date.now() - t0;
    }
  } catch {
    redisLatencyMs = null;
  }

  const errorRate24h =
    totalRequests24h > 0 ? Math.round((errors24h / totalRequests24h) * 10000) / 100 : 0;

  // 시간대별 로그인 (24h, 4시간 버킷)
  const buckets = Array.from({ length: 6 }, (_, i) => ({
    label: `${(24 - (5 - i) * 4) % 24}h`,
    count: 0,
  }));
  for (const row of hourlyLogins) {
    const ageH = (now.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000);
    const idx = Math.min(5, Math.max(0, Math.floor(ageH / 4)));
    const bucket = buckets[5 - idx];
    if (bucket) bucket.count++;
  }

  return {
    timestamp: now.toISOString(),
    onlineUsers: onlineUsers.length,
    logins: { last1h: logins1h, last24h: logins24h },
    ai: {
      events1h: aiChat1h,
      events24h: aiChat24h,
      /** AI_CHAT 1회 ≈ 1~3k tokens 추정 (운영 참고용) */
      estimatedTokens24h: aiChat24h * 2000,
    },
    errors: {
      last1h: errors1h,
      last24h: errors24h,
      errorRate24h,
    },
    orders24h,
    infrastructure: {
      database: overview.database,
      redis: { ...overview.redis, latencyMs: redisLatencyMs },
      uptimeSec: overview.runtime.uptimeSec,
    },
    loginTrend: buckets,
  };
}
