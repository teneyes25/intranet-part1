import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis/client";
import { applySecurityHeaders } from "@/lib/security/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
      version: process.env.npm_package_version ?? "0.1.0",
      buildId: process.env.BUILD_ID ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
      checks,
      llm: await import("@/lib/ai/llm-ensure")
        .then(({ peekLlmStatus }) => peekLlmStatus())
        .catch((e) => ({
          ok: false,
          detail: e instanceof Error ? e.message : "llm_health_failed",
        })),
    },
    { status },
  );
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  applySecurityHeaders(res.headers);
  return res;
}
