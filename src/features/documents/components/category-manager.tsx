"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDocumentCategoryAction,
  deleteDocumentCategoryAction,
} from "@/features/documents/actions";
import type { DocumentCategory } from "@prisma/client";

export function DocumentCategoryManager({
  categories,
}: {
  categories: DocumentCategory[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={(fd) => {
          startTransition(async () => {
            await addDocumentCategoryAction(fd);
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.description ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startTransition(() => deleteDocumentCategoryAction(c.id))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
