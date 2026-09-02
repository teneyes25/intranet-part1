"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBoardAction,
  updateBoardAction,
  type BoardAdminState,
} from "@/features/boards-admin/actions";

const initial: BoardAdminState = {};

const ROLE_OPTIONS = [
  { value: "HEADQUARTER", label: "본사" },
  { value: "DEALER", label: "대리점" },
  { value: "ADMIN", label: "관리자" },
] as const;

export function BoardForm({
  mode,
  initialBoard,
}: {
  mode: "create" | "edit";
  initialBoard?: {
    key: string;
    name: string;
    description: string | null;
    categories: string[];
    writeRoles: string[];
    allowComments: boolean;
  };
}) {
  const action = mode === "create" ? createBoardAction : updateBoardAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" ? (
        <input type="hidden" name="key" value={initialBoard?.key} />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="key">게시판 키 (영문)</Label>
          <Input
            id="key"
            name="key"
            placeholder="regulations"
            required
            pattern="[a-z][a-z0-9_-]*"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialBoard?.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Input
          id="description"
          name="description"
          defaultValue={initialBoard?.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categories">카테고리 (쉼표 구분)</Label>
        <Input
          id="categories"
          name="categories"
          defaultValue={initialBoard?.categories.join(", ") ?? ""}
          placeholder="인사, 복무, 안전"
        />
      </div>

      <fieldset className="space-y-2">
        <Legend>작성 권한 (비우면 전원 작성 가능)</Legend>
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="writeRoles"
                value={r.value}
                defaultChecked={initialBoard?.writeRoles.includes(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allowComments"
          defaultChecked={initialBoard?.allowComments ?? true}
        />
        댓글 허용
      </label>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장되었습니다.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "create" ? "게시판 생성" : "변경 저장"}
      </Button>
    </form>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return <legend className="text-sm font-medium">{children}</legend>;
}
