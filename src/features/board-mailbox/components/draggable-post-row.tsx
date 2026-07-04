"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

interface DraggablePostRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DraggablePostRow({
  id,
  children,
  className,
}: DraggablePostRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "mailbox-row flex items-center gap-1",
        className,
        isDragging && "mailbox-row-dragging",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={cn(
          "hidden shrink-0 touch-none rounded-md p-1.5 text-muted-foreground transition-colors",
          "hover:bg-primary/10 hover:text-primary md:inline-flex",
          "cursor-grab active:cursor-grabbing",
        )}
        aria-label="드래그하여 폴더로 이동"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </li>
  );
}
