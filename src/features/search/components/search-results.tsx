import Link from "next/link";
import { FileText, Bot, FolderOpen, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/board/utils";
import type { SearchResultItem } from "../queries";

const TYPE_ICON = {
  post: FileText,
  document: FolderOpen,
  approval: FileCheck2,
  semantic: Bot,
};

export function SearchResults({
  items,
  query,
}: {
  items: SearchResultItem[];
  query?: string;
}) {
  if (!query) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        검색어를 입력하면 게시물, 공지, 뉴스, 문서, 상품자료, 전자결재를 통합 검색합니다.
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        &apos;{query}&apos;에 대한 검색 결과가 없습니다.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {items.map((item) => {
        const Icon = TYPE_ICON[item.type];
        return (
          <li key={`${item.type}-${item.id}`}>
            <Link
              href={item.href}
              className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:px-6"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.title}</span>
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
                  {item.snippet}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {formatDate(item.date)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
