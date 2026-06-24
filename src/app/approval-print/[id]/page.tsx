import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/features/board/utils";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { PrintButton } from "@/features/approval/components/print-button";
import { getDocument } from "@/features/approval/queries";
import {
  APPROVAL_STATUS_LABEL,
  STEP_STATUS_LABEL,
  type ApprovalStatusKey,
  type StepStatusKey,
} from "@/features/approval/constants";

export const metadata: Metadata = { title: "기안서 출력" };

export default async function ApprovalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const steps = [...doc.steps].sort(
    (a, b) => a.stepOrder - b.stepOrder || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black print:p-0">
      <style>{`@media print { @page { margin: 18mm; } body { background: #fff; } }`}</style>

      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <h1 className="mb-6 text-center text-3xl font-bold tracking-[0.4em]">
        기 안 서
      </h1>

      {/* 결재란 */}
      <table className="mb-6 w-full table-fixed border-collapse text-center text-sm">
        <tbody>
          <tr>
            <td
              rowSpan={3}
              className="w-16 border border-gray-400 bg-gray-50 align-middle font-medium"
            >
              결<br />재
            </td>
            {steps.map((s) => (
              <td
                key={`role-${s.id}`}
                className="border border-gray-400 bg-gray-50 px-2 py-1 text-xs"
              >
                {s.stepOrder}단계 · {ROLE_LABELS[s.approver.role]}
              </td>
            ))}
            {steps.length === 0 && (
              <td className="border border-gray-400 px-2 py-1 text-xs text-gray-400">
                결재선 없음
              </td>
            )}
          </tr>
          <tr>
            {steps.map((s) => (
              <td
                key={`name-${s.id}`}
                className="h-16 border border-gray-400 align-middle"
              >
                <div className="font-medium">{s.approver.name}</div>
                <div className="text-xs text-gray-500">
                  {STEP_STATUS_LABEL[s.status as StepStatusKey]}
                </div>
              </td>
            ))}
            {steps.length === 0 && <td className="border border-gray-400" />}
          </tr>
          <tr>
            {steps.map((s) => (
              <td
                key={`date-${s.id}`}
                className="border border-gray-400 px-1 py-1 text-[11px] text-gray-500"
              >
                {s.actedAt ? formatDateTime(s.actedAt) : "-"}
              </td>
            ))}
            {steps.length === 0 && <td className="border border-gray-400" />}
          </tr>
        </tbody>
      </table>

      {/* 문서 정보 */}
      <table className="mb-6 w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th className="w-28 border border-gray-400 bg-gray-50 px-3 py-1.5 text-left">
              문서번호
            </th>
            <td className="border border-gray-400 px-3 py-1.5">
              AP-{doc.id.slice(-8).toUpperCase()}
            </td>
            <th className="w-24 border border-gray-400 bg-gray-50 px-3 py-1.5 text-left">
              상태
            </th>
            <td className="border border-gray-400 px-3 py-1.5">
              {APPROVAL_STATUS_LABEL[doc.status as ApprovalStatusKey]}
            </td>
          </tr>
          <tr>
            <th className="border border-gray-400 bg-gray-50 px-3 py-1.5 text-left">
              기안자
            </th>
            <td className="border border-gray-400 px-3 py-1.5">
              {doc.drafter.name} ({ROLE_LABELS[doc.drafter.role]})
            </td>
            <th className="border border-gray-400 bg-gray-50 px-3 py-1.5 text-left">
              기안일
            </th>
            <td className="border border-gray-400 px-3 py-1.5">
              {formatDateTime(doc.submittedAt ?? doc.createdAt)}
            </td>
          </tr>
          <tr>
            <th className="border border-gray-400 bg-gray-50 px-3 py-1.5 text-left">
              제목
            </th>
            <td colSpan={3} className="border border-gray-400 px-3 py-1.5 font-medium">
              {doc.title}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 본문 */}
      <div className="min-h-[300px] rounded border border-gray-300 p-5">
        <RichTextContent html={doc.content} className="text-black" />
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        본 문서는 인트라넷 전자결재 시스템에서 출력되었습니다.
      </p>
    </div>
  );
}
