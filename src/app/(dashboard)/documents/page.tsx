import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import {
  ensureFrenchMaisonTree,
  getDocumentBoxTree,
  isDocumentBoxManager,
} from "@/features/documents/box-service";
import { canManageDocumentBoxes } from "@/features/documents/permissions";
import { ROOT_DOCUMENT_BOX_SLUG } from "@/features/documents/constants";

export const metadata: Metadata = { title: "문서함" };

export default async function DocumentsPage() {
  const user = await requireUser();
  await ensureFrenchMaisonTree();

  const [tree, designated] = await Promise.all([
    getDocumentBoxTree({ activeOnly: true }),
    isDocumentBoxManager(user.id),
  ]);

  const canManage = canManageDocumentBoxes({
    role: user.role,
    isDesignatedManager: designated,
  });

  const root = tree.find((n) => n.slug === ROOT_DOCUMENT_BOX_SLUG) ?? tree[0];
  if (root) {
    redirect(`/documents/${root.slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="문서함"
          description="프렌치메종 문서함 폴더 트리입니다."
        />
        {canManage && (
          <Button asChild variant="outline">
            <Link href="/admin/document-categories">
              <Settings2 className="h-4 w-4" />
              문서함 관리
            </Link>
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 opacity-50" />
          등록된 문서함 폴더가 없습니다.
        </CardContent>
      </Card>
    </div>
  );
}
