import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, Printer, ArrowLeft, FileText, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/features/board/utils";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { ConfirmDeleteForm } from "@/features/board/components/confirm-delete-form";
import { ApprovalLine } from "@/features/approval/components/approval-line";
import { ApprovalActions } from "@/features/approval/components/approval-actions";
import { OfficialDocumentFrame } from "@/features/approval/components/official-document-frame";
import { ExecuteForm } from "@/features/approval/components/execute-form";
import { EditApprovalPopupButton } from "@/features/approval/components/edit-approval-popup-button";
import { getDocument } from "@/features/approval/queries";
import {
  getActionableStep,
  canEditDocument,
  canDeleteDocument,
  canExecuteDocument,
} from "@/features/approval/permissions";
import { deleteDocumentAction } from "@/features/approval/actions";
import {
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_VARIANT,
  type ApprovalStatusKey,
} from "@/features/approval/constants";
import { APPROVAL_KIND_LABEL } from "@/features/approval/kinds";

export const metadata: Metadata = { title: "결재 문서" };

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const doc = await getDocument(id);
  if (!doc) notFound();

  const actionable = getActionableStep(doc, user.id);
  const canEdit = canEditDocument(doc, user.id);
  const canDelete = canDeleteDocument(doc, user.id);
  const canExecute = canExecuteDocument(doc, user.id);
  const status = doc.status as ApprovalStatusKey;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/approval">
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={APPROVAL_STATUS_VARIANT[status]}>
              {APPROVAL_STATUS_LABEL[status]}
            </Badge>
            <Badge variant="outline">{APPROVAL_KIND_LABEL[doc.kind]}</Badge>
            {doc.documentNumber && (
              <span className="font-mono text-xs text-muted-foreground">
                {doc.documentNumber}
              </span>
            )}
            {doc.template?.name && (
              <span className="text-xs text-muted-foreground">{doc.template.name}</span>
            )}
            {doc.executedAt && <Badge variant="secondary">시행완료</Badge>}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{doc.title}</h2>
          <p className="text-sm text-muted-foreground">
            기안자 {doc.drafter.name} ({ROLE_LABELS[doc.drafter.role]}) ·{" "}
            {doc.submittedAt
              ? `상신 ${formatDateTime(doc.submittedAt)}`
              : `작성 ${formatDateTime(doc.createdAt)}`}
            {doc.completedAt ? ` · 결재 ${formatDateTime(doc.completedAt)}` : ""}
            {doc.executedAt ? ` · 시행 ${formatDateTime(doc.executedAt)}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/approval-print/${doc.id}`} target="_blank">
              <Printer className="h-4 w-4" />
              PDF / 인쇄
            </Link>
          </Button>
          {canEdit && <EditApprovalPopupButton id={doc.id} />}
          {canDelete && (
            <ConfirmDeleteForm
              action={deleteDocumentAction}
              message="이 문서를 삭제하시겠습니까?"
            >
              <input type="hidden" name="documentId" value={doc.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            </ConfirmDeleteForm>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                기안문
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OfficialDocumentFrame
                kind={doc.kind}
                title={doc.title}
                documentNumber={doc.documentNumber}
                status={doc.status}
                drafterName={doc.drafter.name}
                drafterRole={doc.drafter.role}
                draftedAt={doc.submittedAt ?? doc.createdAt}
                approvedAt={doc.completedAt}
                executedAt={doc.executedAt}
                registeredAt={doc.registeredAt}
                steps={doc.steps}
                sealSrc={
                  doc.sealStorageKey ? `/api/approval/${doc.id}/media?type=seal` : null
                }
                signatureSrc={
                  doc.signatureStorageKey
                    ? `/api/approval/${doc.id}/media?type=signature`
                    : null
                }
                compact
              >
                {doc.content ? (
                  <RichTextContent html={doc.content} />
                ) : (
                  <p className="text-sm text-muted-foreground">본문이 비어 있습니다.</p>
                )}
              </OfficialDocumentFrame>
            </CardContent>
          </Card>

          {doc.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="h-4 w-4" />
                  첨부파일
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {doc.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        className="text-primary underline"
                        href={`/api/approval-files/${a.id}`}
                      >
                        {a.filename}
                      </a>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {(a.size / 1024).toFixed(0)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결재선</CardTitle>
            </CardHeader>
            <CardContent>
              {doc.steps.length > 0 ? (
                <ApprovalLine
                  steps={doc.steps}
                  currentOrder={doc.currentOrder}
                  documentStatus={doc.status}
                />
              ) : (
                <p className="text-sm text-muted-foreground">지정된 결재선이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {actionable && <ApprovalActions documentId={doc.id} />}

          {canExecute && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">시행</CardTitle>
              </CardHeader>
              <CardContent>
                <ExecuteForm documentId={doc.id} kind={doc.kind} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
