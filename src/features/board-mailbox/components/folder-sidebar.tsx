"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  File,
  Folder,
  GripVertical,
  Inbox,
  Plus,
  Star,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SYSTEM_FOLDERS } from "@/features/board-mailbox/constants";
import {
  createPostFolderAction,
  createPostLabelAction,
  deletePostFolderAction,
  deletePostLabelAction,
} from "@/features/board-mailbox/actions";
import {
  DroppableFolder,
  folderDropId,
} from "@/features/board-mailbox/components/droppable-folder";
import type {
  CustomFolder,
  MailboxCounts,
  UserLabel,
} from "@/features/board-mailbox/types";

const ICONS = {
  inbox: Inbox,
  star: Star,
  file: File,
  trash: Trash2,
  folder: Folder,
  tag: Tag,
} as const;

interface FolderSidebarProps {
  boardKey: string;
  activeFolder: string;
  activeLabelId?: string;
  counts: MailboxCounts;
  customFolders: CustomFolder[];
  labels: UserLabel[];
  useDndKit?: boolean;
}

export function FolderSidebar({
  boardKey,
  activeFolder,
  activeLabelId,
  counts,
  customFolders,
  labels,
  useDndKit = false,
}: FolderSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(folder: string, labelId?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("folder", folder);
    if (labelId) params.set("label", labelId);
    else params.delete("label");
    params.delete("page");
    router.push(`/boards/${boardKey}/mailbox?${params.toString()}`);
  }

  async function addFolder() {
    const name = window.prompt("새 폴더 이름");
    if (!name?.trim()) return;
    const r = await createPostFolderAction(boardKey, name);
    if (r.error) toast.error(r.error);
    else toast.success("폴더가 생성되었습니다.");
  }

  async function addLabel() {
    const name = window.prompt("새 라벨 이름");
    if (!name?.trim()) return;
    const r = await createPostLabelAction(boardKey, name);
    if (r.error) toast.error(r.error);
    else toast.success("라벨이 생성되었습니다.");
  }

  function wrapDrop(id: string, node: React.ReactNode) {
    if (!useDndKit) return node;
    return <DroppableFolder id={id}>{node}</DroppableFolder>;
  }

  function folderBtn(
    key: string,
    label: string,
    Icon: typeof Inbox,
    count: number,
    active: boolean,
    dropKey: string | null,
  ) {
    const btn = (
      <button
        type="button"
        onClick={() => navigate(key)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
          active
            ? "bg-brand-light/15 font-semibold text-brand-dark shadow-soft"
            : "text-slate-custom-600 hover:bg-slate-custom-200/60 hover:text-navy-900",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-brand-mid")} />
        <span className="flex-1 text-left">{label}</span>
        <span className="min-w-[1.25rem] text-right text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      </button>
    );

    return (
      <div key={key}>{wrapDrop(folderDropId(dropKey), btn)}</div>
    );
  }

  return (
    <aside className="surface-card flex flex-col gap-5 p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <div className="rounded-lg bg-navy-900 px-3 py-2.5 text-white">
        <p className="text-xs font-medium text-white/70">게시판 메일함</p>
        <p className="text-sm font-semibold">폴더 · 라벨 · @dnd-kit 이동</p>
      </div>

      <div>
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-custom-500">
          시스템
        </p>
        <nav className="space-y-0.5">
          {SYSTEM_FOLDERS.map((f) => {
            const Icon = ICONS[f.icon];
            const active = !activeLabelId && activeFolder === f.key;
            const count = counts[f.key as keyof Omit<MailboxCounts, "folders">];
            return folderBtn(f.key, f.name, Icon, count, active, f.key);
          })}
        </nav>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-custom-500">
            내 폴더
          </p>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={addFolder}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-0.5">
          {customFolders.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">+ 버튼으로 폴더 추가</p>
          )}
          {customFolders.map((f) => {
            const active = !activeLabelId && activeFolder === f.id;
            const btn = (
              <button
                type="button"
                onClick={() => navigate(f.id)}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-brand-light/15 font-semibold text-brand-dark"
                    : "text-slate-custom-600 hover:bg-slate-custom-200/60",
                )}
              >
                <Folder className="h-4 w-4 shrink-0" style={{ color: f.color ?? "#60A5FA" }} />
                <span className="flex-1 truncate text-left">{f.name}</span>
                <span className="text-xs tabular-nums">{counts.folders[f.id] ?? 0}</span>
              </button>
            );
            return (
              <div key={f.id} className="group flex items-center gap-0.5">
                {wrapDrop(folderDropId(f.id), btn)}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={async () => {
                    if (!window.confirm(`「${f.name}」 폴더를 삭제할까요?`)) return;
                    const r = await deletePostFolderAction(boardKey, f.id);
                    if (r.error) toast.error(r.error);
                    else toast.success("폴더를 삭제했습니다.");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </nav>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-custom-500">
            라벨
          </p>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={addLabel}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-0.5">
          {labels.map((l) => {
            const active = activeLabelId === l.id;
            return (
              <div key={l.id} className="group flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => navigate("inbox", l.id)}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all",
                    active
                      ? "bg-brand-light/15 font-semibold text-brand-dark"
                      : "text-slate-custom-600 hover:bg-slate-custom-200/60",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="truncate">{l.name}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={async () => {
                    if (!window.confirm(`「${l.name}」 라벨을 삭제할까요?`)) return;
                    await deletePostLabelAction(boardKey, l.id);
                    toast.success("라벨을 삭제했습니다.");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-border/60 pt-3">
        <Link
          href={`/boards/${boardKey}`}
          className="flex items-center gap-2 px-2 text-xs text-muted-foreground transition-colors hover:text-brand-dark"
        >
          <GripVertical className="h-3.5 w-3.5" />
          일반 목록 보기
        </Link>
      </div>
    </aside>
  );
}
