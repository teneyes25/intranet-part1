"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  adminDeleteMailboxFolderAction,
  adminDeleteMailboxLabelAction,
  adminPurgeMailboxTrashAction,
} from "@/features/boards-admin/actions";

export function MailboxAdminPanel({
  boardKey,
  trashed,
  folders,
  labels,
}: {
  boardKey: string;
  trashed: number;
  folders: {
    id: string;
    name: string;
    user: { name: string; email: string };
    _count: { mailItems: number };
  }[];
  labels: {
    id: string;
    name: string;
    color: string;
    user: { name: string; email: string };
    _count: { assignments: number };
  }[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">메일함 관리</h3>
          <p className="text-xs text-muted-foreground">
            사용자 커스텀 폴더·라벨 및 휴지통 정리
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || trashed === 0}
          onClick={() =>
            start(async () => {
              const fd = new FormData();
              fd.set("boardKey", boardKey);
              const r = await adminPurgeMailboxTrashAction(fd);
              if ("error" in r && r.error) toast.error(r.error);
              else toast.success(`휴지통 ${r.count ?? 0}건 삭제`);
            })
          }
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          휴지통 비우기 ({trashed})
        </Button>
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          커스텀 폴더 ({folders.length})
        </h4>
        {folders.length === 0 ? (
          <p className="text-sm text-muted-foreground">없음</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {folders.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.user.name} · {f.user.email} · 메일 {f._count.mailItems}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`폴더 "${f.name}" 삭제?`)) return;
                    start(async () => {
                      const fd = new FormData();
                      fd.set("folderId", f.id);
                      fd.set("boardKey", boardKey);
                      await adminDeleteMailboxFolderAction(fd);
                      toast.success("폴더 삭제됨");
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          라벨 ({labels.length})
        </h4>
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">없음</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {labels.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: l.color }}
                  />
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.user.name} · 지정 {l._count.assignments}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`라벨 "${l.name}" 삭제?`)) return;
                    start(async () => {
                      const fd = new FormData();
                      fd.set("labelId", l.id);
                      fd.set("boardKey", boardKey);
                      await adminDeleteMailboxLabelAction(fd);
                      toast.success("라벨 삭제됨");
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
