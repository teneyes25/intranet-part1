"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  Fragment,
} from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createManagers, setCreateManagers] = useState<string[]>([]);
  const [editManagers, setEditManagers] = useState<string[]>([]);
  const editPanelRef = useRef<HTMLElement | null>(null);

  const editing = useMemo(
    () => boxes.find((b) => b.id === editingId) ?? null,
    [boxes, editingId],
  );

  useEffect(() => {
    if (editing && editPanelRef.current) {
      editPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [editing]);

  function startEdit(box: DocumentBoxRow) {
    setEditingId(box.id);
    setEditManagers(box.managers.map((m) => m.user.id));
    setError(null);
    setSuccess(null);
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
              if (res?.error) {
                setError(res.error);
                setSuccess(null);
              } else {
                setError(null);
                setSuccess("문서함이 생성되었습니다.");
                setCreateManagers([]);
                router.refresh();
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
      {success && (
        <p className="text-sm text-emerald-700" role="status">
          {success}
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
              <Fragment key={b.id}>
                <tr
                  className={
                    !b.isActive
                      ? "opacity-50"
                      : editingId === b.id
                        ? "bg-primary/5"
                        : undefined
                  }
                >
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
                      variant={editingId === b.id ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() =>
                        editingId === b.id ? setEditingId(null) : startEdit(b)
                      }
                      aria-label="수정"
                      title="수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        startTransition(async () => {
                          if (!window.confirm(`「${b.name}」문서함을 삭제할까요?`)) {
                            return;
                          }
                          const res = await deleteDocumentBoxAction(b.id);
                          if (res?.error) {
                            setError(res.error);
                            setSuccess(null);
                          } else {
                            setError(null);
                            setSuccess("문서함이 삭제되었습니다.");
                            if (editingId === b.id) setEditingId(null);
                            router.refresh();
                          }
                        })
                      }
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
                {editingId === b.id && editing && (
                  <tr>
                    <td colSpan={7} className="bg-primary/5 px-4 py-4">
                      <EditDocumentBoxForm
                        key={editing.id}
                        ref={editPanelRef}
                        box={editing}
                        boxes={boxes}
                        candidates={candidates}
                        canAssignManagers={canAssignManagers}
                        editManagers={editManagers}
                        pending={pending}
                        onToggleManager={(id) =>
                          toggleManager(editManagers, setEditManagers, id)
                        }
                        onCancel={() => setEditingId(null)}
                        onSubmit={(fd) => {
                          editManagers.forEach((id) => fd.append("managerIds", id));
                          startTransition(async () => {
                            const res = await updateDocumentBoxAction(editing.id, fd);
                            if (res?.error) {
                              setError(res.error);
                              setSuccess(null);
                            } else {
                              setError(null);
                              setSuccess(`「${editing.name}」문서함 정보가 저장되었습니다.`);
                              setEditingId(null);
                              router.refresh();
                            }
                          });
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EditDocumentBoxForm = forwardRef<
  HTMLElement,
  {
    box: DocumentBoxRow;
    boxes: DocumentBoxRow[];
    candidates: ManagerCandidate[];
    canAssignManagers: boolean;
    editManagers: string[];
    pending: boolean;
    onToggleManager: (id: string) => void;
    onCancel: () => void;
    onSubmit: (fd: FormData) => void;
  }
>(function EditDocumentBoxForm(
  {
    box,
    boxes,
    candidates,
    canAssignManagers,
    editManagers,
    pending,
    onToggleManager,
    onCancel,
    onSubmit,
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className="space-y-3 rounded-lg border border-primary/30 bg-background p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">문서함 수정 — {box.name}</h3>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="닫기">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <form action={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor={`edit-name-${box.id}`}>이름</Label>
          <Input
            id={`edit-name-${box.id}`}
            name="name"
            defaultValue={box.name}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-classification-${box.id}`}>분류</Label>
          <Input
            id={`edit-classification-${box.id}`}
            name="classification"
            defaultValue={box.classification ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-classificationCode-${box.id}`}>분류번호</Label>
          <Input
            id={`edit-classificationCode-${box.id}`}
            name="classificationCode"
            defaultValue={box.classificationCode ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-retentionDays-${box.id}`}>보존기간(일)</Label>
          <Input
            id={`edit-retentionDays-${box.id}`}
            name="retentionDays"
            type="number"
            min={1}
            placeholder="비우면 영구"
            defaultValue={box.retentionDays ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-description-${box.id}`}>설명</Label>
          <Input
            id={`edit-description-${box.id}`}
            name="description"
            defaultValue={box.description ?? ""}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`edit-isActive-${box.id}`}>활성</Label>
          <select
            id={`edit-isActive-${box.id}`}
            name="isActive"
            defaultValue={box.isActive ? "true" : "false"}
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`edit-parentId-${box.id}`}>상위 폴더</Label>
          <select
            id={`edit-parentId-${box.id}`}
            name="parentId"
            defaultValue={box.parentId ?? ""}
            className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">없음 (최상위)</option>
            {boxes
              .filter((b) => b.isActive && b.id !== box.id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.parent ? `${b.parent.name} / ${b.name}` : b.name}
                </option>
              ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
          슬러그 <code className="rounded bg-muted px-1">{box.slug}</code> 은 변경할 수
          없습니다.
        </div>
        {canAssignManagers && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>지정 관리자</Label>
            <ManagerPicker
              candidates={candidates}
              selected={editManagers}
              onToggle={onToggleManager}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            취소
          </Button>
        </div>
      </form>
    </section>
  );
});

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
