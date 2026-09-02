"use client";

import { useTransition } from "react";
import { Pencil, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDocumentCategoryAction,
  backfillDocumentCategoriesAction,
  deleteDocumentCategoryAction,
  updateDocumentCategoryAction,
} from "@/features/documents/actions";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { documents: number; approvals: number };
};

export function DocumentCategoryManager({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          문서함 카테고리는 전자결재 완료 문서 보관 분류와 연동됩니다.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await backfillDocumentCategoriesAction();
              toast.success(`기존 문서 ${r.linked ?? 0}건을 카테고리에 연결했습니다.`);
            })
          }
        >
          <Link2 className="h-4 w-4" />
          기존 문서 연결
        </Button>
      </div>

      <form
        action={(fd) => {
          startTransition(async () => {
            const r = await addDocumentCategoryAction(fd);
            if (r?.error) toast.error(r.error);
            else toast.success("카테고리를 추가했습니다.");
          });
        }}
        className="grid gap-2 sm:grid-cols-4"
      >
        <Input name="name" placeholder="카테고리 이름" required />
        <Input name="slug" placeholder="slug (영문)" required />
        <Input name="description" placeholder="설명 (선택)" />
        <Button type="submit" disabled={pending}>
          추가
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">슬러그</th>
              <th className="px-4 py-3">설명</th>
              <th className="px-4 py-3">문서/결재</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3" colSpan={5}>
                  <form
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto_auto] sm:items-center"
                    action={(fd) => {
                      startTransition(async () => {
                        const r = await updateDocumentCategoryAction(fd);
                        if (r?.error) toast.error(r.error);
                        else toast.success("저장했습니다.");
                      });
                    }}
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <Input name="name" defaultValue={c.name} required />
                    <Input value={c.slug} disabled readOnly />
                    <Input
                      name="description"
                      defaultValue={c.description ?? ""}
                      placeholder="설명"
                    />
                    <span className="text-xs text-muted-foreground">
                      문서 {c._count?.documents ?? 0} · 결재{" "}
                      {c._count?.approvals ?? 0}
                    </span>
                    <div className="flex gap-1 justify-self-end">
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>
                        <Pencil className="h-3.5 w-3.5" />
                        저장
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`「${c.name}」 카테고리를 삭제할까요?`)) return;
                          startTransition(async () => {
                            await deleteDocumentCategoryAction(c.id);
                            toast.success("삭제했습니다.");
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
