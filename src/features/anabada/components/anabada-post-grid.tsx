"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, ImageIcon, MessageCircle, MessageSquare, Paperclip, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saleStatusLabel } from "@/features/board/board-search-utils";
import { formatDate } from "@/features/board/utils";
import { AnabadaPostActions } from "@/features/anabada/components/anabada-post-actions";
import type { AnabadaPostRow } from "@/features/anabada/types";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "나눔";
  if (price === 0) return "무료";
  return `${price.toLocaleString("ko-KR")}원`;
}

function saleStatusClass(status: string | null | undefined) {
  if (status === "selling") return "bg-emerald-500/90 text-white";
  if (status === "reserved") return "bg-amber-500/90 text-white";
  return "bg-muted-foreground/80 text-white";
}

function thumbnailUrl(post: AnabadaPostRow): string | null {
  const first = post.attachments?.[0];
  if (!first?.mimeType?.startsWith("image/")) return null;
  return `/api/files/${first.id}`;
}

interface AnabadaPostGridProps {
  boardKey: string;
  items: AnabadaPostRow[];
  selected?: Set<string>;
  onToggle?: (id: string, checked: boolean) => void;
  canManage?: (post: AnabadaPostRow) => boolean;
}

export function AnabadaPostGrid({
  boardKey,
  items,
  selected,
  onToggle,
  canManage,
}: AnabadaPostGridProps) {
  if (items.length === 0) {
    return (
      <div className="surface-muted border-dashed p-12 text-center text-sm text-muted-foreground">
        등록된 물품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((post) => {
        const thumb = thumbnailUrl(post);
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
              <div className="relative aspect-[4/3] bg-muted/40">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                    <span className="text-xs">이미지 없음</span>
                  </div>
                )}
                {post.isPinned && (
                  <Pin className="absolute right-2 top-2 h-4 w-4 text-destructive drop-shadow" />
                )}
                {post.saleStatus && (
                  <Badge
                    className={`absolute bottom-2 right-2 border-0 text-[10px] font-semibold ${saleStatusClass(post.saleStatus)}`}
                  >
                    {saleStatusLabel(post.saleStatus)}
                  </Badge>
                )}
                <div className="absolute bottom-2 left-2 rounded-lg bg-background/95 px-2.5 py-1 shadow-sm">
                  <p className="text-sm font-bold text-primary">{formatPrice(post.price)}</p>
                </div>
              </div>

              <div className="space-y-2 p-3">
                <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
                  {post.title}
                </p>
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

            <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="min-h-10 flex-1 touch-target-sm">
                <Link href={`/boards/${boardKey}/${post.id}#comments`}>
                  <MessageCircle className="h-4 w-4" />
                  문의하기
                </Link>
              </Button>
              {canManage?.(post) && (
                <AnabadaPostActions
                  boardKey={boardKey}
                  postId={post.id}
                  canManage
                />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
