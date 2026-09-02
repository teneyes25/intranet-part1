import { NextResponse } from "next/server";
import { z } from "zod";

import { runIngestJob } from "@/features/customize/ai-ingest-service";
import { writeAudit } from "@/lib/audit/service";
import { withApiGuard, parseJsonBody } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  scope: z.enum(["all", "boards", "curated"]).default("all"),
  boardKeys: z.array(z.string()).optional().default([]),
});

export const POST = withApiGuard({ minRole: "ADMIN", tier: "ai" }, async (req, { session, ip }) => {
  const parsed = await parseJsonBody(req, bodySchema);
  if ("error" in parsed) return parsed.error;

  try {
    const result = await runIngestJob({
      triggeredById: session!.user.id,
      scope: parsed.data.scope ?? "all",
      boardKeys: parsed.data.boardKeys ?? [],
    });
    void writeAudit({
      action: "AI_INGEST_RUN",
      userId: session!.user.id,
      userEmail: session!.user.email ?? undefined,
      ip,
      resource: result.jobId,
      detail:
        (parsed.data.scope ?? "all") === "all"
          ? "api_full"
          : (parsed.data.boardKeys ?? []).join(","),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/ai/ingest]", e);
    return NextResponse.json({ error: "인제스트 중 오류" }, { status: 500 });
  }
});
