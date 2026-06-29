"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface DraggablePostRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isDragging?: boolean;
}

export function DraggablePostRow({
  id,
  children,
  className,
}: DraggablePostRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "mailbox-row flex items-center gap-2",
        className,
        isDragging && "mailbox-row-dragging opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </li>
  );
}
