export type ApprovalKind =
  | "GENERAL"
  | "BUDGET"
  | "LEAVE"
  | "EXTERNAL_OFFICIAL"
  | "INTERNAL_OFFICIAL"
  | "INTAKE";

export type ApprovalStepRole =
  | "HANDLER"
  | "REVIEWER"
  | "APPROVER"
  | "COOPERATE"
  | "PROXY";

export const APPROVAL_MAX_FILES = 10;
export const APPROVAL_MAX_FILE_SIZE = 100 * 1024 * 1024;
/** 순차 결재(담당·검토·승인·전결) 최대 단계 */
export const APPROVAL_MAX_SEQUENTIAL_STEPS = 4;

export const APPROVAL_KIND_OPTIONS: {
  key: ApprovalKind;
  label: string;
  templateKey: string;
  hint: string;
}[] = [
  {
    key: "GENERAL",
    label: "일반기안",
    templateKey: "general",
    hint: "범용 기안·품의",
  },
  {
    key: "BUDGET",
    label: "예산집행품의서",
    templateKey: "budget",
    hint: "예산 집행 승인",
  },
  {
    key: "LEAVE",
    label: "연차사용신청서",
    templateKey: "leave",
    hint: "연차·반차 신청",
  },
  {
    key: "EXTERNAL_OFFICIAL",
    label: "외부공문",
    templateKey: "external-official",
    hint: "시행 시 디지털 사용인감",
  },
  {
    key: "INTERNAL_OFFICIAL",
    label: "내부공문",
    templateKey: "internal-official",
    hint: "시행 시 발송자 서명",
  },
  {
    key: "INTAKE",
    label: "문서접수",
    templateKey: "intake",
    hint: "스캔 첨부 · 번호 FM-YYMMDD-000",
  },
];

export const APPROVAL_KIND_LABEL: Record<ApprovalKind, string> = Object.fromEntries(
  APPROVAL_KIND_OPTIONS.map((k) => [k.key, k.label]),
) as Record<ApprovalKind, string>;

export const APPROVAL_KIND_TITLE: Record<ApprovalKind, string> = {
  GENERAL: "기 안 문",
  BUDGET: "예산집행 품의서",
  LEAVE: "연차사용신청서",
  EXTERNAL_OFFICIAL: "공    문",
  INTERNAL_OFFICIAL: "내 부 공 문",
  INTAKE: "문 서 접 수",
};

export const APPROVAL_STEP_ROLE_OPTIONS: {
  key: ApprovalStepRole;
  label: string;
  defaultTitle: string;
}[] = [
  { key: "HANDLER", label: "담당자", defaultTitle: "담당" },
  { key: "REVIEWER", label: "검토자", defaultTitle: "팀장" },
  { key: "APPROVER", label: "승인자", defaultTitle: "이사" },
  { key: "COOPERATE", label: "협조자", defaultTitle: "협조" },
  { key: "PROXY", label: "전결자", defaultTitle: "전결" },
];

export const APPROVAL_STEP_ROLE_LABEL: Record<ApprovalStepRole, string> =
  Object.fromEntries(
    APPROVAL_STEP_ROLE_OPTIONS.map((r) => [r.key, r.label]),
  ) as Record<ApprovalStepRole, string>;

export function isApprovalKind(v: string): v is ApprovalKind {
  return APPROVAL_KIND_OPTIONS.some((k) => k.key === v);
}

export function isApprovalStepRole(v: string): v is ApprovalStepRole {
  return APPROVAL_STEP_ROLE_OPTIONS.some((r) => r.key === v);
}

export function defaultTitleForRole(role: ApprovalStepRole) {
  return (
    APPROVAL_STEP_ROLE_OPTIONS.find((r) => r.key === role)?.defaultTitle ?? "승인"
  );
}