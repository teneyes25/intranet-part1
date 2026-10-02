import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { withApiGuard, parseJsonBody } from "@/lib/security/api-guard";
import { isKnowledgeV1Enabled, knowledgeTenantId } from "@/lib/knowledge/flags";
import { createAppKnowledgeService } from "@/lib/knowledge/dev-store";
import { userContextFromSession } from "@/lib/knowledge/auth-context";

export const runtime = "nodejs";

const schema = z.object({
  query: z.string().trim().min(1).max(200),
});

export const POST = withApiGuard({ tier: "ai" }, async (req, { session }) => {
  if (!isKnowledgeV1Enabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const parsed = await parseJsonBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const dbUser = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, isActive: true, approvalStatus: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const service = createAppKnowledgeService();
  let groups: string[] = [];
  try {
    groups = await service.listStaffGroups(knowledgeTenantId(), dbUser.id);
  } catch {
    groups = [];
  }
  const ctx = userContextFromSession({ ...dbUser, groups });
  const results = await service.search(ctx, parsed.data.query);
  return NextResponse.json({
    request_id: crypto.randomUUID(),
    results,
    warnings: [],
  });
});
