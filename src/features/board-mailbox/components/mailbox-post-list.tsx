"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Eye,
  MessageSquare,
  Paperclip,
  Pin,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/features/board/utils";
import {
  assignLabelsAction,
  bulkDeletePostsAction,
  movePostsAction,
  toggleImportantAction,
} from "@/features/board-mailbox/actions";
import { DraggablePostRow } from "@/features/board-mailbox/components/draggable-post-row";
import { MobileFolderMove } from "@/features/board-mailbox/components/mobile-folder-move";
import type { CustomFolder, MailboxPostRow, UserLabel } from "@/features/board-mailbox/types";

interface MailboxPostListProps {
  boardKey: string;
  items: MailboxPostRow[];
  customFolders: CustomFolder[];
  labels: UserLabel[];
  activeFolder: string;
  total: number;
  useDndKit?: boolean;
}

export function MailboxPostList({
  boardKey,
  items,
  customFolders,
  labels,
  activeFolder,
  total,
  useDndKit = false,
}: MailboxPostListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allChecked = items.length > 0 && selected.size === items.length;

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(fn: () => Promise<{ error?: string; ok?: boolean; deleted?: number }>) {
    if (selected.size === 0) {
      toast.error("게시글을 선택하세요.");
      return;
    }
    startTransition(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success("처리했습니다.");
        setSelected(new Set());
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
        이 폴더에 게시글이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="surface-muted flex flex-wrap items-center gap-2 px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-input"
          />
          전체
        </label>
        <span className="text-xs text-muted-foreground">
          {selected.size > 0 ? `${selected.size}건 선택` : `총 ${total}건`}
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={pending || selected.size === 0}
            onClick={() =>
              runBulk(() =>
                movePostsAction(boardKey, [...selected], { type: "important" }),
              )
            }
          >
            <Star className="h-3.5 w-3.5" />
            중요
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || selected.size === 0}
            onClick={() =>
              runBulk(() =>
                movePostsAction(boardKey, [...selected], { type: "trash" }),
              )
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            휴지통
          </Button>
          {customFolders.length > 0 && (
            <Select
              onValueChange={(folderId) =>
                runBulk(() =>
                  movePostsAction(boardKey, [...selected], {
                    type: "folder",
                    folderId,
                  }),
                )
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs" disabled={pending || selected.size === 0}>
                <SelectValue placeholder="폴더 이동" />
              </SelectTrigger>
              <SelectContent>
                {customFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {labels.length > 0 && (
            <Select
              onValueChange={(labelId) =>
                runBulk(() =>
                  assignLabelsAction(boardKey, [...selected], [labelId]),
                )
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs" disabled={pending || selected.size === 0}>
                <SelectValue placeholder="라벨 지정" />
              </SelectTrigger>
              <SelectContent>
                {labels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeFolder === "trash" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || selected.size === 0}
              onClick={() =>
                runBulk(() => bulkDeletePostsAction(boardKey, [...selected]))
              }
            >
              영구 삭제
            </Button>
          )}
        </div>
      </div>

      <ul className="surface-card overflow-hidden divide-y divide-border/50 p-0">
        {items.map((p) => {
          const row = (
            <>
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleOne(p.id)}
                className="ml-3 h-4 w-4 shrink-0 rounded border-input"
                onClick={(e) => e.stopPropagation()}
              />
              <Link
                href={`/boards/${boardKey}/${p.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-2 py-3.5 text-sm"
              >
                {p.isPinned && <Pin className="h-4 w-4 shrink-0 text-destructive" />}
                {p.mail?.isImportant && (
                  <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                )}
                {p.category && <Badge variant="secondary">{p.category}</Badge>}
                {p.mail?.labelIds &&
                  p.mail.labelIds.length > 0 &&
                  labels
                    .filter((l) => p.mail?.labelIds.includes(l.id))
                    .map((l) => (
                      <Badge
                        key={l.id}
                        variant="outline"
                        className="border-0 text-[10px]"
                        style={{ backgroundColor: `${l.color}20`, color: l.color }}
                      >
                        {l.name}
                      </Badge>
                    ))}
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
                  {formatDate(p.createdAt)}
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-2 shrink-0"
                onClick={() =>
                  startTransition(async () => {
                    await toggleImportantAction(boardKey, p.id);
                    toast.success("중요 표시를 변경했습니다.");
                  })
                }
                aria-label={p.mail?.isImportant ? "중요 해제" : "중요 표시"}
              >
                <Star
                  className={
                    p.mail?.isImportant
                      ? "h-4 w-4 fill-amber-400 text-amber-400"
                      : "h-4 w-4 text-muted-foreground"
                  }
                />
              </Button>
              {useDndKit && (
                <MobileFolderMove
                  boardKey={boardKey}
                  postId={p.id}
                  customFolders={customFolders}
                />
              )}
            </>
          );

          if (useDndKit) {
            return (
              <DraggablePostRow
                key={p.id}
                id={p.id}
                className={cn(
                  "mailbox-row",
                  selected.has(p.id) && "bg-brand-light/5",
                )}
              >
                {row}
              </DraggablePostRow>
            );
          }

          return (
            <li
              key={p.id}
              className={cn(
                "mailbox-row",
                selected.has(p.id) && "bg-brand-light/5",
              )}
            >
              {row}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
