export type ApprovalStatusKey =
  | "DRAFT"
  | "IN_PROGRESS"
  | "REJECTED"
  | "COMPLETED";

export type StepStatusKey = "PENDING" | "APPROVED" | "REJECTED";

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatusKey, string> = {
  DRAFT: "임시저장",
  IN_PROGRESS: "진행중",
  REJECTED: "반려",
  COMPLETED: "완료",
};

/** Badge variant 매핑 */
export const APPROVAL_STATUS_VARIANT: Record<
  ApprovalStatusKey,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  IN_PROGRESS: "default",
  REJECTED: "destructive",
  COMPLETED: "secondary",
};

export const STEP_STATUS_LABEL: Record<StepStatusKey, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
};
