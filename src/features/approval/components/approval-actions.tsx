"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveAction, rejectAction, type ActionState } from "../actions";

const initial: ActionState = {};

export function ApprovalActions({ documentId }: { documentId: string }) {
  const [approveState, approve, approving] = useActionState(
    approveAction,
    initial,
  );
  const [rejectState, reject, rejecting] = useActionState(rejectAction, initial);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">결재 처리</p>

      {(approveState?.error || rejectState?.error) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {approveState?.error || rejectState?.error}
        </p>
      )}

      <form action={approve} className="space-y-2">
        <input type="hidden" name="documentId" value={documentId} />
        <Textarea
          name="comment"
          rows={2}
          placeholder="승인 의견 (선택)"
        />
        <Button type="submit" className="w-full" disabled={approving}>
          {approving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          승인
        </Button>
      </form>

      <form action={reject} className="space-y-2">
        <input type="hidden" name="documentId" value={documentId} />
        <Textarea
          name="comment"
          rows={2}
          placeholder="반려 사유 (필수)"
        />
        <Button
          type="submit"
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={rejecting}
        >
          {rejecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          반려
        </Button>
      </form>
    </div>
  );
}
