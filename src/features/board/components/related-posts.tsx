import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/board/utils";
import type { RelatedPostItem } from "@/features/board/queries";

export function RelatedPosts({
  boardKey,
  boardName,
  items,
}: {
  boardKey: string;
  boardName: string;
  items: RelatedPostItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">관련 게시물</h2>
        <Link
          href={`/boards/${boardKey}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {boardName} 더보기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="divide-y">
        {items.map((p) => (
          <li key={p.id}>
            <Link
              href={`/boards/${boardKey}/${p.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 active:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {p.category}
                    </Badge>
                  )}
                  <span className="line-clamp-1 text-sm font-medium">{p.title}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.authorName} · {formatDate(p.createdAt)} · 조회 {p.viewCount}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
