import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Printer, ArrowLeft, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/features/board/utils";
import { RichTextContent } from "@/features/board/components/rich-text-content";
import { ConfirmDeleteForm } from "@/features/board/components/confirm-delete-form";
import { ApprovalLineFlow } from "@/features/approval/components/approval-line-flow";
import { ApprovalActions } from "@/features/approval/components/approval-actions";
import { getDocument } from "@/features/approval/queries";
import {
  getActionableStep,
  canEditDocument,
  canDeleteDocument,
} from "@/features/approval/permissions";
import { deleteDocumentAction } from "@/features/approval/actions";
import {
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_VARIANT,
  type ApprovalStatusKey,
} from "@/features/approval/constants";

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
          <div className="flex items-center gap-2">
            <Badge variant={APPROVAL_STATUS_VARIANT[status]}>
              {APPROVAL_STATUS_LABEL[status]}
            </Badge>
            {doc.template?.name && (
              <span className="text-xs text-muted-foreground">
                {doc.template.name}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{doc.title}</h2>
          <p className="text-sm text-muted-foreground">
            기안자 {doc.drafter.name} ({ROLE_LABELS[doc.drafter.role]}) ·{" "}
            {doc.submittedAt
              ? `상신 ${formatDateTime(doc.submittedAt)}`
              : `작성 ${formatDateTime(doc.createdAt)}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/approval-print/${doc.id}`} target="_blank">
              <Printer className="h-4 w-4" />
              PDF / 인쇄
            </Link>
          </Button>
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/approval/${doc.id}/edit`}>
                <Pencil className="h-4 w-4" />
                수정
              </Link>
            </Button>
          )}
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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                기안 내용
              </CardTitle>
            </CardHeader>
            <CardContent>
              {doc.content ? (
                <RichTextContent html={doc.content} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  본문이 비어 있습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결재선</CardTitle>
            </CardHeader>
            <CardContent>
              {doc.steps.length > 0 ? (
                <ApprovalLineFlow
                  steps={doc.steps}
                  currentOrder={doc.currentOrder}
                  documentStatus={doc.status}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  지정된 결재선이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {actionable && <ApprovalActions documentId={doc.id} />}
        </div>
      </div>
    </div>
  );
}
