import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { STEP_STATUS_LABEL, type StepStatusKey } from "../constants";

interface Step {
  id: string;
  stepOrder: number;
  status: string;
  approver: { name: string; role: Role };
}

const STATUS_ICON: Record<StepStatusKey, typeof CheckCircle2> = {
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  PENDING: Clock,
};

const STATUS_BADGE: Record<StepStatusKey, string> = {
  APPROVED: "status-badge-success",
  REJECTED: "status-badge-danger",
  PENDING: "status-badge-neutral",
};

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

/** Pilot용 가로 결재선 타임라인 (CSS Flex) */
export function ApprovalLineFlow({
  steps,
  currentOrder,
  documentStatus,
}: {
  steps: Step[];
  currentOrder: number;
  documentStatus: string;
}) {
  const groups = new Map<number, Step[]>();
  for (const s of steps) {
    const arr = groups.get(s.stepOrder) ?? [];
    arr.push(s);
    groups.set(s.stepOrder, arr);
  }
  const orders = [...groups.keys()].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4 overflow-x-auto pb-2">
      <div className="flex min-w-max items-start gap-0 px-1">
        {orders.map((order, idx) => {
          const groupSteps = groups.get(order)!;
          const isActive =
            documentStatus === "IN_PROGRESS" && order === currentOrder;
          const isLast = idx === orders.length - 1;

          return (
            <div key={order} className="flex items-start">
              <div className="flex w-[9.5rem] shrink-0 flex-col items-center gap-2 sm:w-[10.5rem]">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    isActive
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {order}
                </div>
                <div className="w-full space-y-2 px-1">
                  {groupSteps.map((s) => {
                    const st = s.status as StepStatusKey;
                    const Icon = STATUS_ICON[st] ?? Circle;
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-lg border p-2 text-center shadow-xs",
                          isActive && "border-accent/30 bg-accent/[0.04]",
                        )}
                      >
                        <div
                          className={cn(
                            "mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                            s.status === "APPROVED" && "bg-green-100 text-green-700",
                            s.status === "REJECTED" && "bg-destructive/10 text-destructive",
                            s.status === "PENDING" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {initials(s.approver.name)}
                        </div>
                        <p className="truncate text-xs font-medium">{s.approver.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ROLE_LABELS[s.approver.role]}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center gap-0.5 text-[10px]",
                            STATUS_BADGE[st],
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {STEP_STATUS_LABEL[st]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {isActive && (
                  <span className="status-badge-info text-[10px]">진행 중</span>
                )}
              </div>
              {!isLast && (
                <div
                  className="mt-5 flex h-0.5 w-8 shrink-0 items-center sm:w-12"
                  aria-hidden
                >
                  <span className="h-px w-full bg-border" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
