import { NextResponse } from "next/server";

import { withApiGuard } from "@/lib/security/api-guard";
import { isKnowledgeV1Enabled, knowledgeTenantId } from "@/lib/knowledge/flags";
import { createAppKnowledgeService } from "@/lib/knowledge/dev-store";

export const runtime = "nodejs";

export const GET = withApiGuard(
  { tier: "api", roles: ["ADMIN"] },
  async () => {
    if (!isKnowledgeV1Enabled() && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    try {
      const service = createAppKnowledgeService();
      const jobs = await service.listJobStatus(knowledgeTenantId());
      return NextResponse.json({
        enabled: isKnowledgeV1Enabled(),
        jobCount: jobs.length,
        jobs: jobs.map((j) => ({
          id: j.id,
          documentId: j.documentId,
          type: j.type,
          status: j.status,
          attempts: j.attempts,
          lastError: j.lastError,
          completedAt: j.completedAt,
        })),
      });
    } catch (error) {
      return NextResponse.json(
        {
          enabled: isKnowledgeV1Enabled(),
          jobs: [],
          error:
            error instanceof Error
              ? "knowledge catalog unavailable in this database"
              : "knowledge catalog unavailable",
        },
        { status: 200 },
      );
    }
  },
);
