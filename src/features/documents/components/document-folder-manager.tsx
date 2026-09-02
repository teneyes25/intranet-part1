"use client";

import { useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMyDocumentFolderAction,
  deleteMyDocumentFolderAction,
  updateMyDocumentFolderAction,
} from "@/features/documents/actions";

type Folder = {
  id: string;
  name: string;
  workTypeCode: string | null;
  ownerId: string | null;
  _count?: { documents: number; approvals: number };
};

export function DocumentFolderManager({
  folders,
  allFolders,
}: {
  folders: Folder[];
  allFolders: Folder[];
}) {
  const [pending, start] = useTransition();
  const mine = folders.filter((f) => f.ownerId);
  const shared = folders.filter((f) => !f.ownerId);

  return (
    <div className="space-y-6 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold">내 문서함 관리</h3>
        <p className="text-xs text-muted-foreground">
          기안 시 지정할 문서함을 추가·수정·삭제할 수 있습니다. 삭제 시 문서를 다른
          함으로 이동할 수 있습니다.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        action={(fd) =>
          start(async () => {
            const r = await addMyDocumentFolderAction(fd);
            if (r.error) toast.error(r.error);
            else toast.success("문서함을 추가했습니다.");
          })
        }
      >
        <Input name="name" placeholder="새 문서함 이름" className="max-w-xs" required />
        <Input
          name="workTypeCode"
          placeholder="업무종류(문서번호용, 예: 인사)"
          className="max-w-xs"
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          추가
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">공용 문서함</p>
        <ul className="divide-y rounded-lg border">
          {shared.map((f) => (
            <li key={f.id} className="px-3 py-2 text-sm">
              {f.name}
              <span className="ml-2 text-xs text-muted-foreground">
                업무종류 {f.workTypeCode || f.name} · 문서 {f._count?.documents ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">내 문서함</p>
        <ul className="divide-y rounded-lg border">
          {mine.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              개인 문서함이 없습니다.
            </li>
          )}
          {mine.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <form
                className="flex flex-wrap items-center gap-2"
                action={(fd) =>
                  start(async () => {
                    const r = await updateMyDocumentFolderAction(fd);
                    if (r.error) toast.error(r.error);
                    else toast.success("저장했습니다.");
                  })
                }
              >
                <input type="hidden" name="id" value={f.id} />
                <Input name="name" defaultValue={f.name} className="h-8 w-40" />
                <Input
                  name="workTypeCode"
                  defaultValue={f.workTypeCode ?? ""}
                  className="h-8 w-28"
                  placeholder="업무종류"
                />
                <Button type="submit" size="sm" variant="outline" disabled={pending}>
                  저장
                </Button>
              </form>
              <form
                className="flex flex-wrap items-center gap-2"
                action={(fd) =>
                  start(async () => {
                    if (!window.confirm(`「${f.name}」을(를) 삭제할까요?`)) return;
                    const r = await deleteMyDocumentFolderAction(fd);
                    if (r.error) toast.error(r.error);
                    else toast.success("삭제했습니다.");
                  })
                }
              >
                <input type="hidden" name="id" value={f.id} />
                <select
                  name="moveToCategoryId"
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  defaultValue=""
                >
                  <option value="">문서 → 미분류</option>
                  {allFolders
                    .filter((x) => x.id !== f.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        문서 → {x.name}
                      </option>
                    ))}
                </select>
                <Button type="submit" size="sm" variant="ghost" disabled={pending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
