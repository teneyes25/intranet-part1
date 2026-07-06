"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Bot,
  FolderOpen,
  FileCheck2,
  User,
  ShoppingBag,
  Package,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { splitHighlightParts } from "@/features/board/board-search-utils";
import { formatDate } from "@/features/board/utils";
import { ProductPreviewCard } from "@/features/products/components/product-preview-card";
import type { SearchResultItem } from "../queries";

const TYPE_ICON = {
  post: FileText,
  product: ShoppingBag,
  document: FolderOpen,
  approval: FileCheck2,
  semantic: Bot,
  user: User,
};

const TABS = [
  { key: "all", label: "전체" },
  { key: "post", label: "게시물" },
  { key: "product", label: "상품" },
  { key: "user", label: "사용자" },
  { key: "other", label: "문서·결재" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function HighlightText({ text, query }: { text: string; query?: string }) {
  const parts = splitHighlightParts(text, query);
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="search-highlight">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

function matchTab(item: SearchResultItem, tab: TabKey) {
  if (tab === "all") return true;
  if (tab === "post") return item.type === "post";
  if (tab === "product") return item.type === "product";
  if (tab === "user") return item.type === "user";
  return item.type === "document" || item.type === "approval" || item.type === "semantic";
}

export function SearchResults({
  items,
  query,
}: {
  items: SearchResultItem[];
  query?: string;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const highlightQuery = query && query !== "(의미 검색)" ? query : undefined;

  const filtered = useMemo(
    () => items.filter((item) => matchTab(item, tab)),
    [items, tab],
  );

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: items.length,
      post: items.filter((i) => i.type === "post").length,
      product: items.filter((i) => i.type === "product").length,
      user: items.filter((i) => i.type === "user").length,
      other: items.filter(
        (i) => i.type === "document" || i.type === "approval" || i.type === "semantic",
      ).length,
    };
    return c;
  }, [items]);

  if (!query) {
    return (
      <EmptyState
        icon={Package}
        title="통합 검색"
        description="검색어를 입력하면 게시물, 상품, 사용자, 문서, 전자결재를 한 번에 찾습니다. Cmd+K로 빠른 검색도 이용하세요."
        action={{ label: "AI 에이전트", href: "/ai-agent" }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={`'${query}'에 대한 결과가 없습니다`}
        description="다른 키워드로 검색하거나 AI 의미 검색을 켜 보세요."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={tab === t.key ? "secondary" : "outline"}
            className="h-8 touch-target-sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-[10px]">
              {counts[t.key]}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="이 분류에 결과가 없습니다"
            description="다른 탭을 선택하거나 검색어를 변경해 보세요."
            compact
          />
        ) : (
          filtered.map((item) => {
            if (item.type === "product") {
              return (
                <ProductPreviewCard
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  title={item.title}
                  snippet={item.snippet}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  meta={
                    item.unitPrice != null
                      ? {
                          sku: null,
                          unitPrice: item.unitPrice,
                          totalStock: item.stock ?? 0,
                          isActive: true,
                        }
                      : null
                  }
                  highlight={<HighlightText text={item.title} query={highlightQuery} />}
                />
              );
            }

            const Icon = TYPE_ICON[item.type] ?? FileText;
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="search-result-row flex gap-3 rounded-xl border bg-card px-4 py-3.5 transition-all hover:border-primary/25 hover:shadow-sm active:scale-[0.995] sm:px-5"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      <HighlightText text={item.title} query={highlightQuery} />
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {item.source}
                    </Badge>
                    {item.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                    {item.score !== undefined && (
                      <span className="text-[10px] text-primary">
                        유사도 {(item.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    <HighlightText text={item.snippet} query={highlightQuery} />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDate(item.date)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
