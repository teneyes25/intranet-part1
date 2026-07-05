import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { SearchForm } from "@/features/search/components/search-form";
import { SearchResults } from "@/features/search/components/search-results";
import { cachedUnifiedSearch } from "@/features/search/search-cache";
import type { SearchSourceKey } from "@/features/search/constants";
import {
  type BoardPeriodPreset,
  resolvePeriodRange,
} from "@/features/board/board-search-utils";

export const metadata: Metadata = { title: "통합 검색" };

const PERIOD_VALUES = new Set<BoardPeriodPreset>(["all", "today", "week", "month"]);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    source?: string;
    semantic?: string;
    category?: string;
    from?: string;
    to?: string;
    period?: string;
    author?: string;
    hasAttachment?: string;
    minViews?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const semantic = sp.semantic === "1";
  const source = (sp.source ?? "all") as SearchSourceKey;
  const period = PERIOD_VALUES.has(sp.period as BoardPeriodPreset)
    ? (sp.period as BoardPeriodPreset)
    : "all";
  const author = sp.author?.trim();
  const hasAttachment = sp.hasAttachment === "1";
  const minViewsRaw = sp.minViews ? Number(sp.minViews) : undefined;
  const minViews =
    minViewsRaw != null && !Number.isNaN(minViewsRaw) && minViewsRaw > 0
      ? minViewsRaw
      : undefined;

  let from: Date | undefined;
  let to: Date | undefined;
  if (sp.from) from = new Date(sp.from);
  if (sp.to) {
    to = new Date(sp.to);
    to.setHours(23, 59, 59, 999);
  }
  if (!from && !to && period !== "all") {
    const range = resolvePeriodRange(period);
    from = range.from;
    to = range.to;
  }

  const items =
    q || semantic
      ? await cachedUnifiedSearch({
          q,
          source,
          semantic,
          category: sp.category,
          from,
          to,
          period,
          author,
          hasAttachment,
          minViews,
          role: user.role,
          userId: user.id,
        })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="통합 검색"
        description="게시물, 공지, 뉴스, 문서, 상품자료, 아나바다, 전자결재를 한 번에 검색합니다."
      />
      <SearchForm
        initialQ={q}
        initialSource={source}
        initialSemantic={semantic}
        initialAuthor={author ?? ""}
        initialHasAttachment={hasAttachment}
        initialMinViews={sp.minViews ?? ""}
        initialPeriod={period}
      />
      {q && (
        <p className="text-sm text-muted-foreground">
          &apos;{q}&apos; 검색 결과 <strong>{items.length}</strong>건
          {semantic && " (AI 의미 검색 포함)"}
        </p>
      )}
      <SearchResults items={items} query={q || (semantic ? "(의미 검색)" : undefined)} />
    </div>
  );
}
