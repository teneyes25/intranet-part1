"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const activeItem = items.find((i) => i.id === activeId);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const postId = String(active.id);
    const overId = String(over.id);

    if (!overId.startsWith("folder:")) return;

    const targetKey = overId.replace("folder:", "");
    const r = await movePostDragAction(boardKey, postId, targetKey);
    if (r.error) toast.error(r.error);
    else toast.success("이동했습니다.");
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeItem ? (
          <div className="rounded-lg border bg-card px-4 py-2 text-sm shadow-elevated">
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
