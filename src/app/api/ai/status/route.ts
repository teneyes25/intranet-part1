import { NextResponse } from "next/server";

import { ensureLlmReady } from "@/lib/ai/llm-ensure";
import { withApiGuard } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const maxDuration = 90;

export const POST = withApiGuard({ tier: "ai" }, async () => {
  const status = await ensureLlmReady();
  return NextResponse.json(status);
});

export const GET = POST;
