import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { DocumentCategoryManager } from "@/features/documents/components/category-manager";
import { listDocumentCategories } from "@/features/documents/category-service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "문서함 카테고리" };

export default async function AdminDocumentCategoriesPage() {
  await requireRole(["ADMIN"]);
  const categories = await listDocumentCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="문서함 카테고리"
        description="전자결재 완료 문서가 분류되어 보관됩니다."
      />
      <DocumentCategoryManager categories={categories} />
    </div>
  );
}
