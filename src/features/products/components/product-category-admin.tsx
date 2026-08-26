"use client";

import { useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addProductCategoryAction,
  deleteProductCategoryAction,
  updateProductCategoryAction,
} from "@/features/products/admin-actions";

type Cat = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
};

export function ProductCategoryAdmin({
  categories,
  boardKey = "products",
}: {
  categories: Cat[];
  boardKey?: string;
}) {
  const [pending, start] = useTransition();
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap gap-2"
        action={(fd) =>
          start(async () => {
            const r = await addProductCategoryAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("카테고리를 추가했습니다.");
          })
        }
      >
        <input type="hidden" name="boardKey" value={boardKey} />
        <Input name="name" placeholder="새 카테고리 이름" className="max-w-xs" required />
        <select name="parentId" className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">최상위</option>
          {roots.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} 하위
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          추가
        </Button>
      </form>

      <ul className="space-y-3">
        {roots.map((root) => (
          <li key={root.id} className="rounded-lg border p-3">
            <CategoryRow cat={root} pending={pending} start={start} />
            <ul className="mt-2 space-y-2 border-l pl-4">
              {childrenOf(root.id).map((ch) => (
                <li key={ch.id}>
                  <CategoryRow cat={ch} pending={pending} start={start} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryRow({
  cat,
  pending,
  start,
}: {
  cat: Cat;
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="flex flex-wrap items-center gap-2"
        action={(fd) =>
          start(async () => {
            const r = await updateProductCategoryAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("저장했습니다.");
          })
        }
      >
        <input type="hidden" name="id" value={cat.id} />
        <Input name="name" defaultValue={cat.name} className="h-9 w-48" />
        <span className="text-xs text-muted-foreground">{cat.slug}</span>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          저장
        </Button>
      </form>
      <form
        action={(fd) =>
          start(async () => {
            if (!window.confirm(`「${cat.name}」을(를) 삭제할까요?`)) return;
            const r = await deleteProductCategoryAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("삭제했습니다.");
          })
        }
      >
        <input type="hidden" name="id" value={cat.id} />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
