export interface ComplianceInput {
  title: string;
  content: string;
  steps: { approverId: string }[];
}

export interface ComplianceResult {
  ok: boolean;
  missing: string[];
}

function plainLen(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim().length;
}

/** 전자결재 제출 전 필수 항목 검증 */
export function checkApprovalCompliance(input: ComplianceInput): ComplianceResult {
  const missing: string[] = [];

  if (!input.title.trim()) missing.push("제목");
  if (plainLen(input.content) === 0) missing.push("본문");
  if (!input.steps.some((s) => s.approverId?.trim())) missing.push("결재선");

  if (/예산|비용|지출|품의|구매/.test(input.title + input.content) && plainLen(input.content) < 40) {
    missing.push("금액·세부 내용");
  }

  return { ok: missing.length === 0, missing };
}
