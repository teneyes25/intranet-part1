"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  addDocumentBoxAction,
  deleteDocumentBoxAction,
  updateDocumentBoxAction,
} from "@/features/documents/actions";

export interface ManagerCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DocumentBoxRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  retentionDays: number | null;
  classification: string | null;
  classificationCode: string | null;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  board: { id: string; key: string; name: string } | null;
  managers: { user: ManagerCandidate }[];
  _count: { documents: number; approvals: number; children?: number };
}

export function DocumentBoxManager({
  boxes,
  candidates,
  canAssignManagers,
}: {
  boxes: DocumentBoxRow[];
  candidates: ManagerCandidate[];
  canAssignManagers: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createManagers, setCreateManagers] = useState<string[]>([]);
  const [editManagers, setEditManagers] = useState<string[]>([]);

  const editing = useMemo(
    () => boxes.find((b) => b.id === editingId) ?? null,
    [boxes, editingId],
  );

  function startEdit(box: DocumentBoxRow) {
    setEditingId(box.id);
    setEditManagers(box.managers.map((m) => m.user.id));
    setError(null);
  }

  function toggleManager(
    list: string[],
    setList: (v: string[]) => void,
    userId: string,
  ) {
    setList(
      list.includes(userId)
        ? list.filter((id) => id !== userId)
        : [...list, userId],
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">새 문서함 생성</h3>
        <p className="text-xs text-muted-foreground">
          문서함 생성 시 하위 게시판이 함께 만들어지며, 누구나 기안문·자료로 글을 작성할 수
          있습니다.
        </p>
        <form
          action={(fd) => {
            createManagers.forEach((id) => fd.append("managerIds", id));
            startTransition(async () => {
              const res = await addDocumentBoxAction(fd);
              if (res?.error) setError(res.error);
              else {
                setError(null);
                setCreateManagers([]);
              }
            });
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" placeholder="예: 법무 문서함" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="slug">슬러그</Label>
            <Input id="slug" name="slug" placeholder="legal" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classification">분류</Label>
            <Input id="classification" name="classification" placeholder="법무" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="classificationCode">분류번호</Label>
            <Input
              id="classificationCode"
              name="classificationCode"
              placeholder="LG-01"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="retentionDays">보존기간(일)</Label>
            <Input
              id="retentionDays"
              name="retentionDays"
              type="number"
              min={1}
              placeholder="비우면 영구"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">설명</Label>
            <Input id="description" name="description" placeholder="선택" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="parentId">상위 폴더</Label>
            <select
              id="parentId"
              name="parentId"
              defaultValue=""
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">없음 (최상위)</option>
              {boxes
                .filter((b) => b.isActive)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.parent ? `${b.parent.name} / ${b.name}` : b.name}
                  </option>
                ))}
            </select>
          </div>
          {canAssignManagers && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>지정 관리자</Label>
              <ManagerPicker
                candidates={candidates}
                selected={createManagers}
                onToggle={(id) =>
                  toggleManager(createManagers, setCreateManagers, id)
                }
              />
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>
              문서함 생성
            </Button>
          </div>
        </form>
      </section>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">문서함</th>
              <th className="px-4 py-3">상위</th>
              <th className="px-4 py-3">분류</th>
              <th className="px-4 py-3">보존</th>
              <th className="px-4 py-3">하위 게시판</th>
              <th className="px-4 py-3">관리자</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {boxes.map((b) => (
              <tr key={b.id} className={!b.isActive ? "opacity-50" : undefined}>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.slug}</div>
                  {b.description && (
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {b.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.parent?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div>{b.classification ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.classificationCode ?? "-"}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.retentionDays ? `${b.retentionDays}일` : "영구"}
                </td>
                <td className="px-4 py-3">
                  {b.board ? (
                    <a
                      href={`/boards/${b.board.key}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {b.board.key}
                    </a>
                  ) : (
                    "-"
                  )}
                  <div className="text-xs text-muted-foreground">
                    문서 {b._count.documents} · 결재 {b._count.approvals}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.managers.length === 0 && (
                      <span className="text-xs text-muted-foreground">ADMIN만</span>
                    )}
                    {b.managers.map((m) => (
                      <Badge key={m.user.id} variant="secondary" className="text-[10px]">
                        {m.user.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(b)}
                    aria-label="수정"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteDocumentBoxAction(b.id);
                        if (res?.error) setError(res.error);
                      })
                    }
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">문서함 수정 — {editing.name}</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditingId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form
            action={(fd) => {
              editManagers.forEach((id) => fd.append("managerIds", id));
              startTransition(async () => {
                const res = await updateDocumentBoxAction(editing.id, fd);
                if (res?.error) setError(res.error);
                else {
                  setError(null);
                  setEditingId(null);
                }
              });
            }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <Label>이름</Label>
              <Input name="name" defaultValue={editing.name} required className="mt-1" />
            </div>
            <div>
              <Label>분류</Label>
              <Input
                name="classification"
                defaultValue={editing.classification ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label>분류번호</Label>
              <Input
                name="classificationCode"
                defaultValue={editing.classificationCode ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label>보존기간(일)</Label>
              <Input
                name="retentionDays"
                type="number"
                min={1}
                defaultValue={editing.retentionDays ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label>설명</Label>
              <Input
                name="description"
                defaultValue={editing.description ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label>활성</Label>
              <select
                name="isActive"
                defaultValue={editing.isActive ? "true" : "false"}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
            <div>
              <Label>상위 폴더</Label>
              <select
                name="parentId"
                defaultValue={editing.parentId ?? ""}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">없음 (최상위)</option>
                {boxes
                  .filter((b) => b.isActive && b.id !== editing.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.parent ? `${b.parent.name} / ${b.name}` : b.name}
                    </option>
                  ))}
              </select>
            </div>
            {canAssignManagers && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>지정 관리자</Label>
                <ManagerPicker
                  candidates={candidates}
                  selected={editManagers}
                  onToggle={(id) => toggleManager(editManagers, setEditManagers, id)}
                />
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={pending}>
                저장
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function ManagerPicker({
  candidates,
  selected,
  onToggle,
}: {
  candidates: ManagerCandidate[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-1 max-h-40 overflow-y-auto rounded-md border p-2">
      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">지정 가능한 사용자가 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/60">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => onToggle(c.id)}
                />
                <span>
                  {c.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({c.email})
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
