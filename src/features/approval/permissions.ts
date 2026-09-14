import type { ApprovalDocumentDetail } from "./queries";

/** 기안자가 수정 가능한가(임시저장 상태만) */
export function canEditDocument(
  doc: ApprovalDocumentDetail,
  userId: string,
): boolean {
  return doc.drafterId === userId && doc.status === "DRAFT";
}

/** 기안자가 삭제 가능한가(임시저장/반려 상태) */
export function canDeleteDocument(
  doc: ApprovalDocumentDetail,
  userId: string,
): boolean {
  return (
    doc.drafterId === userId &&
    (doc.status === "DRAFT" || doc.status === "REJECTED")
  );
}

/** 최종 결재 후 기안자가 시행(인감·서명)할 수 있는가 */
export function canExecuteDocument(
  doc: ApprovalDocumentDetail,
  userId: string,
): boolean {
  return (
    doc.drafterId === userId &&
    doc.status === "COMPLETED" &&
    !doc.executedAt
  );
}

/** 현재 사용자가 지금 결재(승인/반려)할 수 있는 단계 */
export function getActionableStep(
  doc: ApprovalDocumentDetail,
  userId: string,
): ApprovalDocumentDetail["steps"][number] | null {
  if (doc.status !== "IN_PROGRESS") return null;
  return (
    doc.steps.find(
      (s) =>
        s.approverId === userId &&
        s.status === "PENDING" &&
        s.stepOrder === doc.currentOrder,
    ) ?? null
  );
}
