"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { movePostDragAction } from "@/features/board-mailbox/actions";
import type { MailboxPostRow } from "@/features/board-mailbox/types";

interface MailboxDndProviderProps {
  boardKey: string;
  items: MailboxPostRow[];
  children: ReactNode;
}

export function MailboxDndProvider({
  boardKey,
  items,
  children,
}: MailboxDndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 280, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeItem = items.find((i) => i.id === activeId);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) {
      setLiveMessage("드래그가 취소되었습니다.");
      return;
    }

    const postId = String(active.id);
    const overId = String(over.id);

    if (!overId.startsWith("folder:")) {
      setLiveMessage("유효하지 않은 드롭 영역입니다.");
      return;
    }

    const targetKey = overId.replace("folder:", "");
    setLiveMessage(`「${activeItem?.title ?? "게시글"}」 이동 중…`);
    const r = await movePostDragAction(boardKey, postId, targetKey);
    if (r.error) {
      toast.error(r.error);
      setLiveMessage(`이동 실패: ${r.error}`);
    } else {
      toast.success("폴더로 이동했습니다.");
      setLiveMessage("폴더로 이동했습니다.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    const item = items.find((i) => i.id === id);
    setLiveMessage(`「${item?.title ?? "게시글"}」 드래그 중 — 폴더에 놓으세요.`);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>
      {children}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeItem ? (
          <div className="mailbox-drag-overlay max-w-sm truncate rounded-xl border border-primary/30 bg-card px-4 py-2.5 text-sm font-medium shadow-elevated">
            {activeItem.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function folderDropId(target: string | null) {
  return `folder:${target ?? "inbox"}`;
}
