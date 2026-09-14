import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { NewsKeywordManager } from "@/features/news/components/news-keyword-manager";
import { listNewsCategories } from "@/features/news/category-service";
import { listNewsKeywords } from "@/features/news/keyword-service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "뉴스 키워드 관리" };

export default async function AdminNewsKeywordsPage() {
  await requireRole(["ADMIN"]);
  const [keywords, categories] = await Promise.all([
    listNewsKeywords(),
    listNewsCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="뉴스 키워드 관리"
        description="분야·키워드를 추가·수정·삭제한 뒤 「변경 내용 저장」으로 유지합니다. 이후 배포·시드에서 삭제한 항목이 되살아나지 않습니다."
      />
      <NewsKeywordManager keywords={keywords} categories={categories} />
    </div>
  );
}
