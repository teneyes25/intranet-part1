import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatDateTime } from "@/features/board/utils";
import {
  APPROVAL_KIND_LABEL,
  APPROVAL_KIND_TITLE,
  APPROVAL_STEP_ROLE_LABEL,
  type ApprovalKind,
  type ApprovalStepRole,
} from "../kinds";
import {
  APPROVAL_STATUS_LABEL,
  STEP_STATUS_LABEL,
  type ApprovalStatusKey,
  type StepStatusKey,
} from "../constants";

export interface OfficialStep {
  id: string;
  stepOrder?: number;
  title?: string | null;
  role?: ApprovalStepRole | string | null;
  status: string;
  actedAt?: Date | string | null;
  approver: { name: string; role?: Role };
}

export function OfficialDocumentFrame({
  kind,
  title,
  documentNumber,
  status,
  drafterName,
  drafterRole,
  draftedAt,
  approvedAt,
  executedAt,
  registeredAt,
  steps,
  children,
  sealSrc,
  signatureSrc,
  compact,
}: {
  kind: ApprovalKind | string;
  title: string;
  documentNumber?: string | null;
  status?: string;
  drafterName: string;
  drafterRole?: Role | string;
  draftedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  executedAt?: Date | string | null;
  registeredAt?: Date | string | null;
  steps: OfficialStep[];
  children?: React.ReactNode;
  sealSrc?: string | null;
  signatureSrc?: string | null;
  compact?: boolean;
}) {
  const kindKey = (kind || "GENERAL") as ApprovalKind;
  const heading = APPROVAL_KIND_TITLE[kindKey] ?? "기 안 문";
  const sorted = [...steps].sort((a, b) => {
    const ao = "stepOrder" in a ? Number((a as { stepOrder?: number }).stepOrder) : 0;
    const bo = "stepOrder" in b ? Number((b as { stepOrder?: number }).stepOrder) : 0;
    return ao - bo;
  });

  return (
    <div
      className="bg-white text-black"
      style={{ fontFamily: '"Batang", "Noto Serif KR", serif' }}
    >
      <h1
        className="mb-4 text-center font-bold tracking-[0.45em]"
        style={{ fontSize: compact ? "1.35rem" : "1.75rem" }}
      >
        {heading}
      </h1>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <table className="w-full max-w-sm border-collapse text-xs">
          <tbody>
            <tr>
              <th className="w-20 border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                문서번호
              </th>
              <td className="border border-neutral-400 px-2 py-1 font-mono">
                {documentNumber || "(상신·완료 시 부여)"}
              </td>
            </tr>
            <tr>
              <th className="border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                기안종류
              </th>
              <td className="border border-neutral-400 px-2 py-1">
                {APPROVAL_KIND_LABEL[kindKey] ?? kind}
                {status
                  ? ` · ${APPROVAL_STATUS_LABEL[status as ApprovalStatusKey] ?? status}`
                  : ""}
              </td>
            </tr>
            <tr>
              <th className="border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                기안일
              </th>
              <td className="border border-neutral-400 px-2 py-1">
                {draftedAt ? formatDateTime(new Date(draftedAt)) : "-"}
              </td>
            </tr>
            <tr>
              <th className="border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                결재일
              </th>
              <td className="border border-neutral-400 px-2 py-1">
                {approvedAt ? formatDateTime(new Date(approvedAt)) : "-"}
              </td>
            </tr>
            <tr>
              <th className="border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                시행일
              </th>
              <td className="border border-neutral-400 px-2 py-1">
                {executedAt ? formatDateTime(new Date(executedAt)) : "-"}
              </td>
            </tr>
            {registeredAt ? (
              <tr>
                <th className="border border-neutral-400 bg-neutral-50 px-2 py-1 text-left font-medium">
                  등록일
                </th>
                <td className="border border-neutral-400 px-2 py-1">
                  {formatDateTime(new Date(registeredAt))}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <table className="ml-auto border-collapse text-center text-xs">
          <tbody>
            <tr>
              <td
                rowSpan={3}
                className="w-10 border border-neutral-500 bg-neutral-50 font-medium leading-tight"
              >
                결<br />재
              </td>
              {(sorted.length ? sorted : [{ id: "_empty" } as OfficialStep]).map((s) => (
                <td
                  key={`h-${s.id}`}
                  className="min-w-[4.5rem] border border-neutral-500 bg-neutral-50 px-2 py-1"
                >
                  {s.id === "_empty"
                    ? "—"
                    : s.title?.trim() ||
                      (s.role
                        ? APPROVAL_STEP_ROLE_LABEL[s.role as ApprovalStepRole]
                        : "결재")}
                </td>
              ))}
            </tr>
            <tr>
              {(sorted.length ? sorted : [{ id: "_empty" } as OfficialStep]).map((s) => (
                <td
                  key={`n-${s.id}`}
                  className="h-16 border border-neutral-500 align-middle"
                >
                  {s.id === "_empty" ? (
                    <span className="text-neutral-400">결재선</span>
                  ) : (
                    <>
                      <div className="font-medium">{s.approver.name}</div>
                      <div className="text-[10px] text-neutral-500">
                        {STEP_STATUS_LABEL[s.status as StepStatusKey] ?? s.status}
                      </div>
                    </>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              {(sorted.length ? sorted : [{ id: "_empty" } as OfficialStep]).map((s) => (
                <td
                  key={`d-${s.id}`}
                  className="border border-neutral-500 px-1 py-1 text-[10px] text-neutral-500"
                >
                  {s.actedAt ? formatDateTime(new Date(s.actedAt)) : "-"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <table className="mb-3 w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th className="w-24 border border-neutral-400 bg-neutral-50 px-3 py-1.5 text-left">
              제목
            </th>
            <td className="border border-neutral-400 px-3 py-1.5 font-medium">{title || " "}</td>
          </tr>
        </tbody>
      </table>

      {children ? (
        <div className="min-h-[220px] border border-neutral-300 p-4">{children}</div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="text-sm">
          <p>
            기안자: {drafterName}
            {drafterRole
              ? ` (${typeof drafterRole === "string" && drafterRole in ROLE_LABELS ? ROLE_LABELS[drafterRole as Role] : drafterRole})`
              : ""}
          </p>
        </div>
        <div className="flex items-end gap-6">
          {sealSrc ? (
            <div className="text-center">
              <p className="mb-1 text-[10px] text-neutral-500">사용인감</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sealSrc} alt="사용인감" className="h-20 w-20 object-contain" />
            </div>
          ) : null}
          {signatureSrc ? (
            <div className="text-center">
              <p className="mb-1 text-[10px] text-neutral-500">발송자 서명</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatureSrc} alt="서명" className="h-16 w-36 object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
