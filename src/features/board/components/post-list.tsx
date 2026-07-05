import Link from "next/link";
import { Eye, MessageSquare, Paperclip, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/board/utils";

export interface PostRow {
  id: string;
  title: string;
  category: string | null;
  isPinned: boolean;
  viewCount: number;
  createdAt: string | Date;
  author: { id: string; name: string };
  _count: { comments: number; attachments: number };
}

export function PostList({
  boardKey,
  items,
}: {
  boardKey: string;
  items: PostRow[];
}) {
  if (items.length === 0) {
    return (
      <div className="surface-muted border-dashed p-12 text-center text-sm text-muted-foreground">
        게시글이 없습니다.
      </div>
    );
  }

  return (
    <ul className="surface-card overflow-hidden divide-y divide-border/50">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/boards/${boardKey}/${p.id}`} className="board-list-row">
            {p.isPinned && (
              <Pin className="h-4 w-4 shrink-0 text-destructive" />
            )}
            {p.category && (
              <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                {p.category}
              </Badge>
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
            <span className="hidden items-center gap-2.5 text-xs text-muted-foreground sm:inline-flex">
              {p._count.attachments > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  {p._count.attachments}
                </span>
              )}
              {p._count.comments > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {p._count.comments}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5">
                <Eye className="h-3.5 w-3.5" />
                {p.viewCount}
              </span>
            </span>
            <span className="hidden w-20 truncate text-right text-sm text-muted-foreground md:block">
              {p.author.name}
            </span>
            <span className="w-14 shrink-0 text-right text-[11px] text-muted-foreground sm:w-24 sm:text-xs">
              {formatDate(p.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
