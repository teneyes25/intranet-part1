"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Eye,
  FolderInput,
  MessageSquare,
  Paperclip,
  Pencil,
  Pin,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  bulkAssignLabelsListAction,
  bulkDeletePostsListAction,
  bulkMoveBoardAction,
  bulkMoveToFolderAction,
  bulkUpdateCategoryAction,
} from "@/features/board/bulk-actions";
import { splitHighlightParts } from "@/features/board/board-search-utils";
import type { PostRow } from "@/features/board/components/post-list";
import { formatDate } from "@/features/board/utils";

interface PostListBulkProps {
  boardKey: string;
  items: PostRow[];
  categories: string[];
  boards: { key: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  folders: { id: string; name: string }[];
  searchQuery?: string;
}

export function PostListBulk({
  boardKey,
  items,
  categories,
  boards,
  labels,
  folders,
  searchQuery,
}: PostListBulkProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => items.map((p) => p.id), [items]);
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allIds) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function runBulk(
    fn: () => Promise<{
      error?: string;
      ok?: boolean;
    }>,
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success("일괄 작업이 완료되었습니다.");
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="surface-muted border-dashed p-12 text-center text-sm text-muted-foreground">
        게시글이 없습니다.
      </div>
    );
  }

  const selectedIds = [...selected];

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
          <Badge variant="secondary" className="font-semibold">
            선택된 {selected.size}개
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || selected.size !== 1}
            asChild={selected.size === 1}
          >
            {selected.size === 1 ? (
              <Link href={`/boards/${boardKey}/${selectedIds[0]}`}>
                <Eye className="h-4 w-4" />
                보기
              </Link>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                보기
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || selected.size !== 1}
            asChild={selected.size === 1}
          >
            {selected.size === 1 ? (
              <Link href={`/boards/${boardKey}/${selectedIds[0]}/edit`}>
                <Pencil className="h-4 w-4" />
                수정
              </Link>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                수정
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runBulk(() => bulkDeletePostsListAction(boardKey, selectedIds))}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </Button>

          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={pending}>
                  <Tag className="h-4 w-4" />
                  카테고리
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>카테고리 지정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() =>
                      runBulk(() => bulkUpdateCategoryAction(boardKey, selectedIds, c))
                    }
                  >
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {boards.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={pending}>
                  <FolderInput className="h-4 w-4" />
                  게시판 이동
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {boards
                  .filter((b) => b.key !== boardKey)
                  .map((b) => (
                    <DropdownMenuItem
                      key={b.key}
                      onClick={() =>
                        runBulk(() => bulkMoveBoardAction(boardKey, selectedIds, b.key))
                      }
                    >
                      {b.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {labels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" disabled={pending}>
                  라벨
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {labels.map((l) => (
                  <DropdownMenuItem
                    key={l.id}
                    onClick={() =>
                      runBulk(() => bulkAssignLabelsListAction(boardKey, selectedIds, [l.id]))
                    }
                  >
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ background: l.color }}
                    />
                    {l.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={pending}>
                메일함 폴더
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  runBulk(() => bulkMoveToFolderAction(boardKey, selectedIds, { type: "inbox" }))
                }
              >
                받은편지함
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  runBulk(() =>
                    bulkMoveToFolderAction(boardKey, selectedIds, { type: "important" }),
                  )
                }
              >
                중요
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  runBulk(() => bulkMoveToFolderAction(boardKey, selectedIds, { type: "trash" }))
                }
              >
                휴지통
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() =>
                    runBulk(() =>
                      bulkMoveToFolderAction(boardKey, selectedIds, {
                        type: "folder",
                        folderId: f.id,
                      }),
                    )
                  }
                >
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            선택 해제
          </Button>
        </div>
      )}

      <ul className="surface-card overflow-hidden divide-y divide-border/50">
        <li className="flex items-center gap-3 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="전체 선택"
          />
          <span className="flex-1">제목</span>
          <span className="hidden w-20 md:block">작성자</span>
          <span className="w-14 text-right">날짜</span>
        </li>
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-0">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-input"
              checked={selected.has(p.id)}
              onChange={(e) => toggleOne(p.id, e.target.checked)}
              aria-label={`${p.title} 선택`}
            />
            <Link href={`/boards/${boardKey}/${p.id}`} className="board-list-row flex-1 !px-0">
              {p.isPinned && <Pin className="h-4 w-4 shrink-0 text-destructive" />}
              {p.category && (
                <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
                  {p.category}
                </Badge>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">
                {splitHighlightParts(p.title, searchQuery).map((part, i) =>
                  part.match ? (
                    <mark key={i} className="rounded bg-primary/20 px-0.5 text-inherit">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </span>
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
    </div>
  );
}
