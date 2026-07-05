"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Eye,
  FolderInput,
  Pencil,
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
import { AnabadaPostGrid } from "@/features/anabada/components/anabada-post-grid";
import type { AnabadaPostRow } from "@/features/anabada/types";
import { canManagePost } from "@/features/board/permissions";

interface AnabadaBoardListProps {
  boardKey: string;
  items: AnabadaPostRow[];
  categories: string[];
  boards: { key: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  folders: { id: string; name: string }[];
  currentUser: { id: string; role: import("@/lib/auth/roles").Role };
  canWrite: boolean;
}

export function AnabadaBoardList({
  boardKey,
  items,
  categories,
  boards,
  labels,
  folders,
  currentUser,
  canWrite,
}: AnabadaBoardListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(() => items.map((p) => p.id), [items]);
  const allSelected = items.length > 0 && selected.size === items.length;
  const selectedIds = [...selected];

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
    fn: () => Promise<{ error?: string; ok?: boolean }>,
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

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex justify-end">
          <Button asChild className="min-h-10 touch-target-sm">
            <Link href={`/boards/${boardKey}/new`}>
              <Pencil className="h-4 w-4" />
              물품 등록
            </Link>
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              aria-label="전체 선택"
            />
            전체 선택
          </label>
        </div>
      )}

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

      <AnabadaPostGrid
        boardKey={boardKey}
        items={items}
        selected={selected}
        onToggle={toggleOne}
        canManage={(post) => canManagePost(currentUser, post.author.id)}
      />
    </div>
  );
}
