import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getBoardByKey, listPosts } from "@/features/board/queries";
import type { BoardPeriodPreset } from "@/features/board/board-search-utils";

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const board = await getBoardByKey(key);
  if (!board) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const to = parseDate(searchParams.get("to"));
  if (to) to.setHours(23, 59, 59, 999);

  const period = (searchParams.get("period") ?? "all") as BoardPeriodPreset;
  const minViews = searchParams.get("minViews");
  const minViewCount = minViews ? Number(minViews) : undefined;

  const result = await listPosts({
    boardId: board.id,
    role: session.user.role,
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    from: parseDate(searchParams.get("from")),
    to,
    period: period !== "all" ? period : undefined,
    author: searchParams.get("author") ?? undefined,
    hasAttachment: searchParams.get("hasAttachment") === "1" || undefined,
    minViewCount: minViewCount && !Number.isNaN(minViewCount) ? minViewCount : undefined,
    page: Number(searchParams.get("page") ?? "1") || 1,
  });

  return NextResponse.json(result);
}
