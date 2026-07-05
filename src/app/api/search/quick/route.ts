import { NextResponse } from "next/server";
import { z } from "zod";

import { quickSearch } from "@/features/search/quick-search";
import { withApiGuard, parseSearchParams } from "@/lib/security/api-guard";

export const runtime = "nodejs";

const quickSchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export const GET = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const parsed = parseSearchParams(req, quickSchema);
  if ("error" in parsed) return parsed.error;

  const q = (parsed.data.q ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await quickSearch({
      q,
      role: session!.user.role,
      userId: session!.user.id,
      dealerId: session!.user.dealerId ?? null,
      perType: 5,
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/search/quick]", e);
    return NextResponse.json({ error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
});
