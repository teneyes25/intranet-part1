"use client";

import type { ApprovalLineTemplate, ApprovalTemplate, User } from "@prisma/client";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RichTextEditor } from "@/features/board/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteApprovalLineTemplateAction,
  deleteApprovalTemplateAction,
  saveApprovalLineTemplateAction,
  saveApprovalTemplateAction,
} from "@/features/customize/actions";
import type { ApprovalLineStep } from "@/features/customize/types";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/roles";

export function ApprovalCustomizeTab({
  templates,
  lineTemplates,
  users,
}: {
  templates: ApprovalTemplate[];
  lineTemplates: ApprovalLineTemplate[];
  users: Pick<User, "id" | "name" | "email" | "role">[];
}) {
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [lineSteps, setLineSteps] = useState<ApprovalLineStep[]>([
    { approverId: users[0]?.id ?? "", stepOrder: 1 },
  ]);

  const editing = templates.find((t) => t.id === editId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">결재 서식 (Template)</CardTitle>
          <CardDescription>Rich Editor로 기안서 양식 관리</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={(fd) => {
              fd.set("content", content);
              if (editId) fd.set("id", editId);
              startTransition(async () => {
                const r = await saveApprovalTemplateAction(fd);
                if (r.error) toast.error(r.error);
                else {
                  toast.success("서식이 저장되었습니다.");
                  setEditId(null);
                  setContent("");
                }
              });
            }}
            className="space-y-3"
          >
            {editId ? (
              <Input type="hidden" name="key" defaultValue={editing?.key} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="key">Key (영문)</Label>
                  <Input id="key" name="key" placeholder="custom-form" required />
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">서식 이름</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editing?.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">설명</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                />
              </div>
            </div>
            <RichTextEditor
              key={editId ?? "new"}
              value={editId ? editing?.content ?? content : content}
              onChange={setContent}
              placeholder="서식 본문 HTML..."
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {editId ? "수정 저장" : "서식 추가"}
              </Button>
              {editId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(null);
                    setContent("");
                  }}
                >
                  취소
                </Button>
              )}
            </div>
          </form>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">이름</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.key}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditId(t.id);
                          setContent(t.content);
                        }}
                      >
                        편집
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            await deleteApprovalTemplateAction(t.id);
                            toast.success("삭제되었습니다.");
                          })
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">결재선 기본 템플릿</CardTitle>
          <CardDescription>부서·직급별 기본 결재라인</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={(fd) => {
              fd.set("steps", JSON.stringify(lineSteps));
              startTransition(async () => {
                const r = await saveApprovalLineTemplateAction(fd);
                if (r.error) toast.error(r.error);
                else toast.success("결재선 템플릿이 저장되었습니다.");
              });
            }}
            className="space-y-3"
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <Input name="name" placeholder="템플릿 이름" required />
              <Input name="department" placeholder="부서 (선택)" />
              <select
                name="targetRole"
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">직급 전체</option>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" /> 기본 템플릿으로 지정
            </label>
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">결재자 순서</p>
              {lineSteps.map((s, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{s.stepOrder}단계</Badge>
                  <select
                    className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                    value={s.approverId}
                    onChange={(e) =>
                      setLineSteps((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, approverId: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({ROLE_LABELS[u.role]})
                      </option>
                    ))}
                  </select>
                  <Input
                    className="max-w-[140px]"
                    placeholder="라벨"
                    value={s.label ?? ""}
                    onChange={(e) =>
                      setLineSteps((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setLineSteps((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setLineSteps((prev) => [
                    ...prev,
                    {
                      approverId: users[0]?.id ?? "",
                      stepOrder: prev.length + 1,
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4" /> 결재자 추가
              </Button>
            </div>
            <Button type="submit" disabled={pending}>
              결재선 템플릿 저장
            </Button>
          </form>

          <ul className="divide-y rounded-lg border">
            {lineTemplates.map((lt) => (
              <li key={lt.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{lt.name}</span>
                  {lt.isDefault && (
                    <Badge className="ml-2" variant="secondary">
                      기본
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {lt.department ?? "전체"} ·{" "}
                    {lt.targetRole ? ROLE_LABELS[lt.targetRole] : "모든 직급"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    startTransition(async () => {
                      await deleteApprovalLineTemplateAction(lt.id);
                      toast.success("삭제되었습니다.");
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
