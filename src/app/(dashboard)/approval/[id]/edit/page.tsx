import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ApprovalForm } from "@/features/approval/components/approval-form";
import { listDocumentCategories } from "@/features/documents/category-service";
import {
  getDocument,
  getTemplates,
  getApproverCandidates,
} from "@/features/approval/queries";
import { canEditDocument } from "@/features/approval/permissions";

export const metadata: Metadata = { title: "기안 수정" };

export default async function EditApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const doc = await getDocument(id);
  if (!doc) notFound();
  if (!canEditDocument(doc, user.id)) redirect(`/approval/${id}`);

  const [templates, candidatesRaw, documentCategories] = await Promise.all([
    getTemplates(),
    getApproverCandidates(user.id),
    listDocumentCategories(),
  ]);

  const candidates = candidatesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    dealerName: c.dealer?.name ?? null,
  }));

  const sortedSteps = [...doc.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const approvers = sortedSteps.map((s, i) => {
    const prev = sortedSteps[i - 1];
    return {
      approverId: s.approverId,
      parallelWithPrev: i > 0 && !!prev && s.stepOrder === prev.stepOrder,
    };
  });

  return (
    <div>
      <PageHeader title="기안 수정" description="임시저장된 기안서를 수정합니다." />
      <Card>
        <CardContent className="pt-6">
          <ApprovalForm
            templates={templates.map((t) => ({
              id: t.id,
              name: t.name,
              content: t.content,
            }))}
            documentCategories={documentCategories.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            candidates={candidates}
            initial={{
              id: doc.id,
              title: doc.title,
              content: doc.content,
              templateId: doc.templateId,
              documentCategoryId: doc.documentCategoryId,
              approvers,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
