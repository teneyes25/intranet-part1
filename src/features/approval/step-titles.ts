/** 전자결재 결재란에 표시할 직책(직함) */
export const APPROVAL_STEP_TITLES = [
  "담당",
  "팀장",
  "이사",
  "대표",
  "대표이사",
  "검토",
  "승인",
  "협조",
  "전결",
] as const;

export type ApprovalStepTitle = (typeof APPROVAL_STEP_TITLES)[number];
