/** 전자결재 상태 머신 — pure functions (Liferay Workflow 경량 패턴) */

export type ApprovalStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
export type StepStatus = "PENDING" | "APPROVED" | "REJECTED";
export type WorkflowAction = "submit" | "approve" | "reject";

export interface WorkflowStep {
  stepOrder: number;
  status: StepStatus;
}

export type AdvanceResult =
  | { type: "waiting" }
  | { type: "continue"; nextOrder: number }
  | { type: "completed" };

export function canTransition(
  status: ApprovalStatus,
  action: WorkflowAction,
): boolean {
  if (action === "submit") return status === "DRAFT";
  if (action === "approve" || action === "reject") return status === "IN_PROGRESS";
  return false;
}

export function statusAfterReject(): ApprovalStatus {
  return "REJECTED";
}

export function statusAfterComplete(): ApprovalStatus {
  return "COMPLETED";
}

/** 승인 1건 반영 후 다음 상태 결정 */
export function advanceAfterApprove(
  currentOrder: number,
  steps: WorkflowStep[],
): AdvanceResult {
  const pendingAtCurrent = steps.filter(
    (s) => s.stepOrder === currentOrder && s.status === "PENDING",
  );
  if (pendingAtCurrent.length > 0) return { type: "waiting" };

  const nextOrders = steps
    .filter((s) => s.stepOrder > currentOrder && s.status === "PENDING")
    .map((s) => s.stepOrder);

  if (nextOrders.length === 0) return { type: "completed" };

  return { type: "continue", nextOrder: Math.min(...nextOrders) };
}
