"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, ImageIcon, MessageSquare, Paperclip, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { splitHighlightParts } from "@/features/board/board-search-utils";
import type { PostRow } from "@/features/board/components/post-list";
import { formatDate } from "@/features/board/utils";

function imageUrl(post: PostRow & { attachments?: { id: string; mimeType: string }[] }) {
  const first = post.attachments?.[0];
  if (!first?.mimeType?.startsWith("image/")) return null;
  return `/api/files/${first.id}`;
}

interface PostListCardsProps {
  boardKey: string;
  items: (PostRow & { attachments?: { id: string; mimeType: string }[] })[];
  selected?: Set<string>;
  onToggle?: (id: string, checked: boolean) => void;
  searchQuery?: string;
}

export function PostListCards({
  boardKey,
  items,
  selected,
  onToggle,
  searchQuery,
}: PostListCardsProps) {
  if (items.length === 0) {
    return (
      <div className="surface-muted border-dashed p-12 text-center text-sm text-muted-foreground">
        게시글이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post) => {
        const thumb = imageUrl(post);
        const isSelected = selected?.has(post.id);

        return (
          <article
            key={post.id}
            className={`board-card group relative overflow-hidden transition-all hover:shadow-md active:scale-[0.99] ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            {onToggle && (
              <label className="absolute left-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-background/90 shadow-sm touch-target-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={!!isSelected}
                  onChange={(e) => onToggle(post.id, e.target.checked)}
                  aria-label={`${post.title} 선택`}
                />
              </label>
            )}

            <Link href={`/boards/${boardKey}/${post.id}`} className="block">
              <div className="relative aspect-[16/10] bg-muted/40">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 100vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/50">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                {post.isPinned && (
                  <Pin className="absolute right-2 top-2 h-4 w-4 text-destructive drop-shadow" />
                )}
              </div>
              <div className="space-y-2 p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {post.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {post.category}
                    </Badge>
                  )}
                </div>
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
                  {splitHighlightParts(post.title, searchQuery).map((part, i) =>
                    part.match ? (
                      <mark key={i} className="rounded bg-primary/20 px-0.5">
                        {part.text}
                      </mark>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </h3>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{post.author.name}</span>
                  <span className="shrink-0">{formatDate(post.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post._count.attachments > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      {post._count.attachments}
                    </span>
                  )}
                  {post._count.comments > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {post._count.comments}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="h-3.5 w-3.5" />
                    {post.viewCount}
                  </span>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
