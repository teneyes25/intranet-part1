"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { folderDropId } from "@/features/board-mailbox/components/mailbox-dnd-provider";

interface DroppableFolderProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function DroppableFolder({
  id,
  children,
  className,
  label,
}: DroppableFolderProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "folder-drop-target")}
      aria-label={label ? `${label}${isOver ? " — 놓으면 이동" : ""}` : undefined}
    >
      {children}
    </div>
  );
}

export { folderDropId };
