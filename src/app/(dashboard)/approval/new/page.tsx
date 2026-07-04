import type { Metadata } from "next";

import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { ApprovalForm } from "@/features/approval/components/approval-form";
import { listDocumentCategories } from "@/features/documents/category-service";
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
    listDocumentCategories(),
  ]);

  const candidates = candidatesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    dealerName: c.dealer?.name ?? null,
  }));

  return (
    <div className="page-shell">
      <PageHero
        variant="plain"
        eyebrow="전자결재"
        title="새 기안"
        description="문서 양식을 선택하고 AI 도움을 받아 기안서를 작성하세요."
        badge="기안"
      />
      <Card className="overflow-hidden border-border/70 shadow-card">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base">기안서 작성</CardTitle>
          <CardDescription>
            양식 선택 → 본문 작성 → 결재선 지정 순으로 진행합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
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
