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
  startsAt?: string | Date | null;
  author: { name: string };
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

  const isSchedule = boardKey === "schedule";

  return (
    <ul className="surface-card overflow-hidden divide-y divide-border/50">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/boards/${boardKey}/${p.id}`}
            className="flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-brand-light/5"
          >
            {p.isPinned && (
              <Pin className="h-4 w-4 shrink-0 text-destructive" />
            )}
            {p.category && <Badge variant="secondary">{p.category}</Badge>}
            <span className="flex-1 truncate font-medium">{p.title}</span>
            {p._count.attachments > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {p._count.attachments}
              </span>
            )}
            {p._count.comments > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {p._count.comments}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {p.viewCount}
            </span>
            <span className="hidden w-20 truncate text-right text-sm text-muted-foreground sm:block">
              {p.author.name}
            </span>
            <span className="hidden w-24 text-right text-xs text-muted-foreground md:block">
              {formatDate(
                isSchedule && p.startsAt ? p.startsAt : p.createdAt,
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

