"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { PostList, type PostRow } from "@/features/board/components/post-list";

interface InfinitePostsProps {
  boardKey: string;
  initialItems: PostRow[];
  initialPage: number;
  initialHasMore: boolean;
  query: {
    q?: string;
    category?: string;
    from?: string;
    to?: string;
    period?: string;
    author?: string;
    hasAttachment?: string;
    minViews?: string;
  };
}

export function InfinitePosts({
  boardKey,
  initialItems,
  initialPage,
  initialHasMore,
  query,
}: InfinitePostsProps) {
  const [items, setItems] = useState<PostRow[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.q) params.set("q", query.q);
      if (query.category) params.set("category", query.category);
      if (query.from) params.set("from", query.from);
      if (query.to) params.set("to", query.to);
      if (query.period) params.set("period", query.period);
      if (query.author) params.set("author", query.author);
      if (query.hasAttachment) params.set("hasAttachment", query.hasAttachment);
      if (query.minViews) params.set("minViews", query.minViews);
      params.set("page", String(page + 1));

      const res = await fetch(`/api/boards/${boardKey}/posts?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: PostRow[];
        page: number;
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...data.items]);
      setPage(data.page);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, [boardKey, hasMore, loading, page, query]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-4">
      <PostList boardKey={boardKey} items={items} />
      <div ref={sentinelRef} className="flex justify-center py-2">
        {loading && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중...
          </span>
        )}
        {!hasMore && items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            마지막 게시글입니다.
          </span>
        )}
      </div>
    </div>
  );
}
