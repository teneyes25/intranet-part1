import { NextResponse } from "next/server";

import { getMonitoringMetrics } from "@/features/monitoring/monitoring-service";
import { jsonError, withApiGuard } from "@/lib/security/api-guard";

export const dynamic = "force-dynamic";

export const GET = withApiGuard({ minRole: "ADMIN", tier: "api" }, async () => {
  try {
    const metrics = await getMonitoringMetrics();
    return NextResponse.json(metrics);
  } catch (e) {
    console.error("[monitoring]", e);
    return jsonError("모니터링 데이터 조회 실패", 500);
  }
});
