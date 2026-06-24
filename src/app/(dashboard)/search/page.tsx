import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { SearchForm } from "@/features/search/components/search-form";
import { SearchResults } from "@/features/search/components/search-results";
import { unifiedSearch } from "@/features/search/queries";
import type { SearchSourceKey } from "@/features/search/constants";

export const metadata: Metadata = { title: "통합 검색" };

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
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const semantic = sp.semantic === "1";
  const source = (sp.source ?? "all") as SearchSourceKey;

  let from: Date | undefined;
  let to: Date | undefined;
  if (sp.from) from = new Date(sp.from);
  if (sp.to) {
    to = new Date(sp.to);
    to.setHours(23, 59, 59, 999);
  }

  const items =
    q || semantic
      ? await unifiedSearch({
          q,
          source,
          semantic,
          category: sp.category,
          from,
          to,
          role: user.role,
          userId: user.id,
        })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="통합 검색"
        description="게시물, 공지, 뉴스, 문서, 상품자료, 전자결재를 한 번에 검색합니다."
      />
      <SearchForm initialQ={q} initialSource={source} initialSemantic={semantic} />
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
