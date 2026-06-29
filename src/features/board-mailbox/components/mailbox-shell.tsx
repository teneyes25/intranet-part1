"use client";

import { Suspense } from "react";

import { BoardPagination } from "@/features/board/components/board-pagination";
import { DraggablePostRow } from "@/features/board-mailbox/components/draggable-post-row";
import {
  DroppableFolder,
  folderDropId,
} from "@/features/board-mailbox/components/droppable-folder";
import { FolderSidebar } from "@/features/board-mailbox/components/folder-sidebar";
import { MailboxDndProvider } from "@/features/board-mailbox/components/mailbox-dnd-provider";
import { MailboxPostList } from "@/features/board-mailbox/components/mailbox-post-list";
import { MailboxSearch } from "@/features/board-mailbox/components/mailbox-search";
import type {
  CustomFolder,
  MailboxCounts,
  MailboxPostRow,
  UserLabel,
} from "@/features/board-mailbox/types";

interface MailboxShellProps {
  boardKey: string;
  folder: string;
  labelId?: string;
  counts: MailboxCounts;
  customFolders: CustomFolder[];
  labels: UserLabel[];
  items: MailboxPostRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function MailboxShell(props: MailboxShellProps) {
  return (
    <MailboxDndProvider boardKey={props.boardKey} items={props.items}>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <FolderSidebar
            boardKey={props.boardKey}
            activeFolder={props.folder}
            activeLabelId={props.labelId}
            counts={props.counts}
            customFolders={props.customFolders}
            labels={props.labels}
            useDndKit
          />
        </Suspense>
        <div className="min-w-0 space-y-4">
          <Suspense fallback={null}>
            <MailboxSearch boardKey={props.boardKey} />
          </Suspense>
          <MailboxPostList
            boardKey={props.boardKey}
            items={props.items}
            customFolders={props.customFolders}
            labels={props.labels}
            activeFolder={props.folder}
            total={props.total}
            useDndKit
          />
          <BoardPagination page={props.page} totalPages={props.totalPages} />
        </div>
      </div>
    </MailboxDndProvider>
  );
}

export { DroppableFolder, folderDropId, DraggablePostRow };
