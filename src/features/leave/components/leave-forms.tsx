"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelLeaveRequestAction,
  setAccruedLeaveAction,
  submitLeaveRequestAction,
  type LeaveActionState,
} from "@/features/leave/actions";

const initial: LeaveActionState = {};

export function LeaveRequestForm({
  defaultPhone,
}: {
  defaultPhone?: string | null;
}) {
  const [state, action, pending] = useActionState(submitLeaveRequestAction, initial);
  const [leaveType, setLeaveType] = useState<"FULL" | "HALF">("FULL");

  return (
    <form action={action} className="space-y-3">
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
            반차 (0.5일 차감)
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
              <p className="text-xs text-muted-foreground">반차는 시작일 기준 0.5일입니다.</p>
            </>
          ) : (
            <Input id="endDate" name="endDate" type="date" required />
          )}
        </div>
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
          placeholder="010-0000-0000"
          defaultValue={defaultPhone ?? ""}
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        신청 시 「연차 유급휴가 사용신청서」 기안문으로 전자결재가 생성됩니다.
        결재선: 일반 → 인사 → 이사 / 인사 신청 → 이사 / 이사 신청 → 대표이사
      </p>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        기안문으로 신청
      </Button>
    </form>
  );
}

export function LeaveRequestActions({
  requestId,
  canCancel,
  approvalId,
}: {
  requestId: string;
  canCancel?: boolean;
  approvalId?: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-1">
      {approvalId && (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/approval/${approvalId}`}>기안문</Link>
        </Button>
      )}
      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelLeaveRequestAction(requestId);
              if (r.error) toast.error(r.error);
              else toast.success("신청을 취소했습니다.");
            })
          }
        >
          취소
        </Button>
      )}
    </div>
  );
}

export function HrAccrualTable({
  rows,
  year,
}: {
  year: number;
  rows: {
    userId: string;
    name: string;
    email: string;
    jobs: string[];
    accruedDays: number;
    usedDays: number;
    remainingDays: number;
    accruedAt: Date | null;
  }[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2">업무</th>
            <th className="px-3 py-2">발생 연차</th>
            <th className="px-3 py-2">발생 시점</th>
            <th className="px-3 py-2">사용/잔여</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.userId}>
              <td className="px-3 py-2 align-top">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
              </td>
              <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                {r.jobs.join(", ") || "-"}
              </td>
              <td className="px-3 py-2 align-top" colSpan={4}>
                <form
                  className="flex flex-wrap items-end gap-2"
                  action={(fd) =>
                    start(async () => {
                      const res = await setAccruedLeaveAction(fd);
                      if (res.error) toast.error(res.error);
                      else toast.success(`${r.name} 연차를 저장했습니다.`);
                    })
                  }
                >
                  <input type="hidden" name="userId" value={r.userId} />
                  <input type="hidden" name="year" value={String(year)} />
                  <div className="space-y-1">
                    <Label className="text-xs">발생일수</Label>
                    <Input
                      name="accruedDays"
                      type="number"
                      step="0.5"
                      min="0"
                      defaultValue={r.accruedDays}
                      className="h-8 w-24"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">발생 시점</Label>
                    <Input
                      name="accruedAt"
                      type="date"
                      defaultValue={
                        r.accruedAt
                          ? r.accruedAt.toISOString().slice(0, 10)
                          : ""
                      }
                      className="h-8 w-36"
                    />
                  </div>
                  <div className="pb-1 text-xs text-muted-foreground">
                    사용 {r.usedDays} · 잔여 {r.remainingDays}
                  </div>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "저장"
                    )}
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
