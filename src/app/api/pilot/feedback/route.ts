import { NextResponse } from "next/server";
import { z } from "zod";

import { createFeedback } from "@/features/pilot/feedback-service";
import { isPilotUser } from "@/features/pilot/pilot-service";
import { writeAudit } from "@/lib/audit/service";
import { withApiGuard, parseJsonBody } from "@/lib/security/api-guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  category: z.enum(["usability", "bug", "feature", "other"]),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(5).max(2000),
  pageUrl: z.string().max(500).optional(),
});

export const POST = withApiGuard({}, async (req, { session, ip }) => {
  const parsed = await parseJsonBody(req, bodySchema);
  if ("error" in parsed) return parsed.error;

  const pilot = await isPilotUser(session!.user.id);
  if (!pilot) {
    return NextResponse.json({ error: "Pilot 사용자만 피드백을 제출할 수 있습니다." }, { status: 403 });
  }

  const fb = await createFeedback({
    userId: session!.user.id,
    ...parsed.data,
  });

  void writeAudit({
    action: "PILOT_FEEDBACK",
    userId: session!.user.id,
    userEmail: session!.user.email ?? undefined,
    ip,
    resource: parsed.data.category,
    detail: parsed.data.message.slice(0, 200),
  });

  return NextResponse.json({ id: fb.id });
});
