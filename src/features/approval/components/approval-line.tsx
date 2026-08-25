import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatDateTime } from "@/features/board/utils";
import { STEP_STATUS_LABEL, type StepStatusKey } from "../constants";

interface Step {
  id: string;
  stepOrder: number;
  status: string;
  comment: string | null;
  actedAt: Date | null;
  title?: string | null;
  approver: { name: string; role: Role };
}

const STATUS_ICON: Record<StepStatusKey, typeof CheckCircle2> = {
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  PENDING: Clock,
};

export function ApprovalLine({
  steps,
  currentOrder,
  documentStatus,
}: {
  steps: Step[];
  currentOrder: number;
  documentStatus: string;
}) {
  // stepOrder 별 그룹화
  const groups = new Map<number, Step[]>();
  for (const s of steps) {
    const arr = groups.get(s.stepOrder) ?? [];
    arr.push(s);
    groups.set(s.stepOrder, arr);
  }
  const orders = [...groups.keys()].sort((a, b) => a - b);

  return (
    <ol className="space-y-3">
      {orders.map((order) => {
        const groupSteps = groups.get(order)!;
        const isActive =
          documentStatus === "IN_PROGRESS" && order === currentOrder;
        const isParallel = groupSteps.length > 1;
        return (
          <li
            key={order}
            className={cn(
              "rounded-lg border p-3",
              isActive && "border-primary/50 bg-primary/5",
            )}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>{order}단계</span>
              {isParallel && (
                <span className="rounded bg-muted px-1.5 py-0.5">병렬</span>
              )}
              {isActive && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">
                  진행 중
                </span>
              )}
            </div>
            <div className="space-y-2">
              {groupSteps.map((s) => {
                const Icon = STATUS_ICON[s.status as StepStatusKey] ?? Circle;
                return (
                  <div key={s.id} className="flex items-start gap-2 text-sm">
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        s.status === "APPROVED" && "text-green-600",
                        s.status === "REJECTED" && "text-destructive",
                        s.status === "PENDING" && "text-muted-foreground",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{s.approver.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.title?.trim() || ROLE_LABELS[s.approver.role]}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            s.status === "APPROVED" && "text-green-600",
                            s.status === "REJECTED" && "text-destructive",
                            s.status === "PENDING" && "text-muted-foreground",
                          )}
                        >
                          · {STEP_STATUS_LABEL[s.status as StepStatusKey]}
                        </span>
                        {s.actedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(s.actedAt)}
                          </span>
                        )}
                      </div>
                      {s.comment && (
                        <p className="mt-0.5 rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                          {s.comment}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
