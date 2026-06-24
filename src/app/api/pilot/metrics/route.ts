import { NextResponse } from "next/server";
import { z } from "zod";

import { getPilotMonitoringData } from "@/features/pilot/queries";
import { trackUsage } from "@/lib/pilot/monitoring";
import { withApiGuard, parseJsonBody } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiGuard({ minRole: "ADMIN" }, async () => {
  const data = await getPilotMonitoringData();
  return NextResponse.json(data);
});

const usageSchema = z.object({
  event: z.string().min(1).max(64),
  resource: z.string().max(255).optional(),
});

export const POST = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const parsed = await parseJsonBody(req, usageSchema);
  if ("error" in parsed) return parsed.error;

  await trackUsage({
    userId: session!.user.id,
    event: parsed.data.event,
    resource: parsed.data.resource,
  });

  return NextResponse.json({ ok: true });
});
