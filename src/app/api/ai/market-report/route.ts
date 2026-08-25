import { NextResponse, type NextRequest } from "next/server";

import { generateMonthlyMarketReport } from "@/lib/ai/market-report";
import { writeAudit } from "@/lib/audit/service";
import { withApiGuard } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    try {
      const result = await generateMonthlyMarketReport("api");
      return NextResponse.json(result);
    } catch (e) {
      console.error("[api/ai/market-report] cron:", e);
      return NextResponse.json({ error: "보고서 생성 실패" }, { status: 500 });
    }
  }

  return withApiGuard({ minRole: "ADMIN", tier: "ai" }, async (_req, { session, ip }) => {
    try {
      const result = await generateMonthlyMarketReport("manual");
      void writeAudit({
        action: "AI_NEWS_COLLECT",
        userId: session!.user.id,
        userEmail: session!.user.email ?? undefined,
        ip,
        resource: "market-report",
        detail: `manual post=${result.postId ?? "-"}`,
      });
      return NextResponse.json(result);
    } catch (e) {
      console.error("[api/ai/market-report]", e);
      return NextResponse.json({ error: "보고서 생성 실패" }, { status: 500 });
    }
  })(req);
}
