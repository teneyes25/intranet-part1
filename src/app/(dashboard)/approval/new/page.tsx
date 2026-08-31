import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ApprovalForm } from "@/features/approval/components/approval-form";
import { listSelectableDocumentCategories } from "@/features/documents/category-service";
import {
  getTemplates,
  getApproverCandidates,
} from "@/features/approval/queries";

export const metadata: Metadata = { title: "새 기안" };

export default async function NewApprovalPage() {
  const user = await requireUser();
  const [templates, candidatesRaw, documentCategories] = await Promise.all([
    getTemplates(),
    getApproverCandidates(user.id),
    listSelectableDocumentCategories(user.id),
  ]);

  const candidates = candidatesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    dealerName: c.dealer?.name ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="새 기안"
        description="문서 양식을 선택하고 AI 도움을 받아 기안서를 작성하세요."
      />
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
