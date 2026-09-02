"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/features/board/components/rich-text-editor";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import {
  submitLeaveRequestAction,
  type LeaveActionState,
} from "@/features/leave/actions";
import { APPROVAL_STEP_TITLES } from "@/features/approval/step-titles";

type Candidate = {
  id: string;
  name: string;
  role: Role;
  dealerName?: string | null;
};

type ApproverRow = {
  approverId: string;
  title: string;
};

const initial: LeaveActionState = {};

export function LeaveDraftComposer({
  defaultPhone,
  defaultContent,
  defaultApprovers,
  candidates,
  remainingDays,
  affiliation,
  userName,
  jobTitles,
}: {
  defaultPhone?: string | null;
  defaultContent: string;
  defaultApprovers: ApproverRow[];
  candidates: Candidate[];
  remainingDays: number;
  affiliation: string;
  userName: string;
  jobTitles: string;
}) {
  const [state, action, pending] = useActionState(submitLeaveRequestAction, initial);
  const [leaveType, setLeaveType] = useState<"FULL" | "HALF">("FULL");
  const [content, setContent] = useState(defaultContent);
  const [approvers, setApprovers] = useState<ApproverRow[]>(defaultApprovers);
  const [picker, setPicker] = useState("");
  const [pickerTitle, setPickerTitle] = useState("인사담당자");
  const [useDefaultLine, setUseDefaultLine] = useState(defaultApprovers.length === 0);

  const stepsJson = useMemo(() => {
    if (useDefaultLine || approvers.length === 0) return "";
    return JSON.stringify(
      approvers.map((a) => ({
        approverId: a.approverId,
        title: a.title,
      })),
    );
  }, [approvers, useDefaultLine]);

  const available = candidates.filter(
    (c) => !approvers.some((a) => a.approverId === c.id),
  );
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="content" value={content} />
      <input type="hidden" name="steps" value={stepsJson} />

      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        신청자: <strong className="text-foreground">{userName}</strong>
        {" · "}
        소속 {affiliation || "-"}
        {" · "}
        업무 {jobTitles || "-"}
        {" · "}
        잔여 연차 <strong className="text-foreground">{remainingDays}일</strong>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">연차 종류</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="leaveType"
              value="FULL"
              checked={leaveType === "FULL"}
              onChange={() => setLeaveType("FULL")}
            />
            일반 연차
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="leaveType"
              value="HALF"
              checked={leaveType === "HALF"}
              onChange={() => setLeaveType("HALF")}
            />
            반차 (0.5일)
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">시작일</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">종료일</Label>
          {leaveType === "HALF" ? (
            <>
              <Input id="endDate" type="date" disabled />
              <input type="hidden" name="endDate" value="" />
            </>
          ) : (
            <Input id="endDate" name="endDate" type="date" required />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">기안 제목 (선택)</Label>
        <Input id="title" name="title" placeholder="비우면 자동 생성" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">신청 사유</Label>
        <Input id="reason" name="reason" placeholder="개인 사유, 여행 등" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emergencyContact">비상 연락처</Label>
        <Input
          id="emergencyContact"
          name="emergencyContact"
          defaultValue={defaultPhone ?? ""}
          placeholder="010-0000-0000"
        />
      </div>

      <div className="space-y-2">
        <Label>기안문 내용 (직접 수정 가능)</Label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-base">결재선</Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDefaultLine}
              onChange={(e) => setUseDefaultLine(e.target.checked)}
            />
            기본선 사용 (신청자 → 인사담당자 → 이사)
          </label>
        </div>

        {!useDefaultLine && (
          <>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-10 min-w-[12rem] rounded-md border bg-background px-3 text-sm"
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
              >
                <option value="">결재자 선택</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({ROLE_LABELS[c.role]}
                    {c.dealerName ? ` · ${c.dealerName}` : ""})
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={pickerTitle}
                onChange={(e) => setPickerTitle(e.target.value)}
              >
                {APPROVAL_STEP_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="인사담당자">인사담당자</option>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!picker) return;
                  setApprovers((prev) => [
                    ...prev,
                    { approverId: picker, title: pickerTitle },
                  ]);
                  setPicker("");
                }}
              >
                <Plus className="h-4 w-4" />
                추가
              </Button>
            </div>
            <ol className="space-y-2">
              {approvers.map((a, i) => {
                const u = candidateMap.get(a.approverId);
                return (
                  <li
                    key={`${a.approverId}-${i}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{u?.name ?? a.approverId}</span>
                    <Input
                      className="h-8 w-32"
                      value={a.title}
                      onChange={(e) =>
                        setApprovers((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setApprovers((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ol>
            {approvers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                결재자를 추가하지 않으면 기본선(인사→이사)이 적용됩니다.
              </p>
            )}
          </>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        기안 상신
      </Button>
    </form>
  );
}
