"use client";

import { useActionState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelLeaveRequestAction,
  reviewLeaveRequestAction,
  submitLeaveRequestAction,
  type LeaveActionState,
} from "@/features/leave/actions";

const initial: LeaveActionState = {};

export function LeaveRequestForm() {
  const [state, action, pending] = useActionState(submitLeaveRequestAction, initial);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">시작일</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">종료일</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">사유 (선택)</Label>
        <Input id="reason" name="reason" placeholder="개인 사유, 여행 등" />
      </div>
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-600">연차 신청이 접수되었습니다.</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        연차 사용 신청
      </Button>
    </form>
  );
}

export function LeaveRequestActions({
  requestId,
  canCancel,
  canReview,
}: {
  requestId: string;
  canCancel?: boolean;
  canReview?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-1">
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
      {canReview && (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reviewLeaveRequestAction(requestId, "APPROVED");
                if (r.error) toast.error(r.error);
                else toast.success("승인했습니다.");
              })
            }
          >
            승인
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const note = window.prompt("반려 사유 (선택)") ?? undefined;
                const r = await reviewLeaveRequestAction(
                  requestId,
                  "REJECTED",
                  note,
                );
                if (r.error) toast.error(r.error);
                else toast.success("반려했습니다.");
              })
            }
          >
            반려
          </Button>
        </>
      )}
    </div>
  );
}
