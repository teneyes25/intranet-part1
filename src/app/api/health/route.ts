import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis/client";
import { applySecurityHeaders } from "@/lib/security/headers";
import {
  getPilotNavModulesSnapshot,
  getVisiblePilotModuleKeys,
} from "@/config/nav-modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // instrumentation 미기동 환경에서 cron 폴백 등록 (멱등)
  try {
    const { startNewsCron } = await import("@/lib/news/scheduler");
    startNewsCron();
  } catch {
    /* non-blocking */
  }

  const checks: Record<string, "ok" | "error"> = {
    app: "ok",
    database: "error",
    redis: "error",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const r = getRedis();
    if (r) {
      if (r.status !== "ready") await r.connect();
      const pong = await r.ping();
      checks.redis = pong === "PONG" ? "ok" : "error";
    } else {
      checks.redis = "ok"; // optional service
    }
  } catch {
    checks.redis = "error";
  }

  const healthy = checks.database === "ok";
  const status = healthy ? 200 : 503;

  const res = NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "0.1.0",
      buildId: process.env.BUILD_ID ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
      pilotMode: process.env.PILOT_MODE === "true",
      pilotModules: getVisiblePilotModuleKeys(),
      navModules: getPilotNavModulesSnapshot(),
      features: {
        commandPalette: true,
        activityFeed: true,
        quickSearch: true,
      },
      checks,
    },
    { status },
  );
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  applySecurityHeaders(res.headers);
  return res;
}
