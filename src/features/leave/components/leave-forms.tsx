"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelLeaveRequestAction,
  setAccruedLeaveAction,
} from "@/features/leave/actions";

export function LeaveRequestForm({
  defaultPhone,
}: {
  defaultPhone?: string | null;
}) {
  void defaultPhone;

  function openDraftWindow() {
    const w = 920;
    const h = 900;
    const left = Math.max(0, Math.round((window.screen.width - w) / 2));
    const top = Math.max(0, Math.round((window.screen.height - h) / 2));
    window.open(
      "/leave/apply",
      "leave-apply",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        「연차 유급휴가 사용신청서」 기안 창에서 내용을 직접 입력·수정하고
        결재선을 지정할 수 있습니다. 결재선을 지정하지 않으면 기본선
        (신청자 → 인사담당자 → 이사)이 적용됩니다.
      </p>
      <Button type="button" onClick={openDraftWindow}>
        기안문으로 신청 (새 창)
      </Button>
    </div>
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
