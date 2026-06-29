"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { folderDropId } from "@/features/board-mailbox/components/mailbox-dnd-provider";

interface DroppableFolderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableFolder({ id, children, className }: DroppableFolderProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "folder-drop-target")}
    >
      {children}
    </div>
  );
}

export { folderDropId };
