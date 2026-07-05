import { NextResponse } from "next/server";
import { z } from "zod";

import { unifiedSearch } from "@/features/search/queries";
import { SEARCH_SOURCES, type SearchSourceKey } from "@/features/search/constants";
import {
  withApiGuard,
  parseSearchParams,
} from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const sourceKeys = SEARCH_SOURCES.map((s) => s.key) as [
  SearchSourceKey,
  ...SearchSourceKey[],
];

const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  source: z.enum(sourceKeys).optional().default("all"),
  semantic: z.enum(["0", "1"]).optional().default("0"),
  category: z.string().max(50).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const GET = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const parsed = parseSearchParams(req, searchQuerySchema);
  if ("error" in parsed) return parsed.error;

  const { q = "", source, semantic, category, from, to } = parsed.data;
  const trimmed = q.trim();

  if (!trimmed && semantic !== "1") {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const items = await unifiedSearch({
      q: trimmed,
      source,
      semantic: semantic === "1",
      category,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      role: session!.user.role,
      userId: session!.user.id,
      dealerId: session!.user.dealerId ?? null,
    });
    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
});
