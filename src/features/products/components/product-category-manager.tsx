"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createProductCategoryAction,
  deleteProductCategoryAction,
  reorderProductCategoriesAction,
  updateProductCategoryAction,
} from "@/features/products/category-actions";

export interface ProductCategoryRow {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

function SortableRow({
  row,
  onDelete,
}: {
  row: ProductCategoryRow;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="bg-background">
      <td className="px-2 py-3">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted"
          {...attributes}
          {...listeners}
          aria-label="순서 변경"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <form
            className="flex gap-2"
            action={(fd) => {
              startTransition(async () => {
                const r = await updateProductCategoryAction(row.id, fd);
                if (r.error) toast.error(r.error);
                else {
                  toast.success("수정되었습니다.");
                  setEditing(false);
                }
              });
            }}
          >
            <Input name="name" defaultValue={row.name} className="h-8" required />
            <Button type="submit" size="sm" disabled={pending}>
              저장
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              취소
            </Button>
          </form>
        ) : (
          <span className="font-medium">{row.name}</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{row.slug}</td>
      <td className="px-4 py-3 text-right">
        {!editing && (
          <>
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </td>
    </tr>
  );
}

export function ProductCategoryManager({
  boardKey,
  categories: initial,
}: {
  boardKey: string;
  categories: ProductCategoryRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);
    startTransition(async () => {
      await reorderProductCategoriesAction(
        boardKey,
        next.map((x) => x.id),
      );
    });
  }

  function handleDelete(id: string) {
    if (!confirm("이 카테고리를 삭제할까요?")) return;
    startTransition(async () => {
      const r = await deleteProductCategoryAction(id);
      if (r.error) toast.error(r.error);
      else {
        toast.success("삭제되었습니다.");
        setRows((prev) => prev.filter((x) => x.id !== id));
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={(fd) => {
          fd.set("boardKey", boardKey);
          startTransition(async () => {
            const r = await createProductCategoryAction(fd);
            if (r.error) toast.error(r.error);
            else {
              toast.success("카테고리가 추가되었습니다.");
              router.refresh();
            }
          });
        }}
        className="flex flex-wrap gap-2"
      >
        <Input name="name" placeholder="새 카테고리 이름" className="max-w-xs" required />
        <Button type="submit" disabled={pending}>
          추가
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="w-10 px-2 py-3" />
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">슬러그</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row) => (
                  <SortableRow key={row.id} row={row} onDelete={handleDelete} />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            등록된 카테고리가 없습니다.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        드래그하여 순서를 변경할 수 있습니다. 게시물 일괄 이동·지정 시 이 카테고리가 사용됩니다.
      </p>
    </div>
  );
}
