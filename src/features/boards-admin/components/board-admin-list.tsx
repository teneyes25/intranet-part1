import Link from "next/link";
import { Pencil, Trash2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteBoardAction } from "@/features/boards-admin/actions";
import type { BoardAdminItem } from "@/features/boards-admin/queries";
import { ConfirmDeleteForm } from "@/features/board/components/confirm-delete-form";

export function BoardAdminList({ boards }: { boards: BoardAdminItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">키</th>
            <th className="px-4 py-3 font-medium">카테고리</th>
            <th className="px-4 py-3 font-medium">글/폴더</th>
            <th className="px-4 py-3 font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {boards.map((b) => (
            <tr key={b.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{b.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {b.key}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {b.categories.length === 0 && (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                  {b.categories.slice(0, 4).map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                  {b.categories.length > 4 && (
                    <span className="text-xs text-muted-foreground">
                      +{b.categories.length - 4}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                글 {b._count.posts} · 폴더 {b._count.postFolders}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/boards/${b.key}`}>
                      <Pencil className="h-3.5 w-3.5" />
                      수정
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/boards/${b.key}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      열기
                    </Link>
                  </Button>
                  {b._count.posts === 0 && (
                    <ConfirmDeleteForm
                      action={deleteBoardAction}
                      message={`${b.name} 게시판을 삭제할까요?`}
                    >
                      <input type="hidden" name="key" value={b.key} />
                      <Button type="submit" size="sm" variant="destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </Button>
                    </ConfirmDeleteForm>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
