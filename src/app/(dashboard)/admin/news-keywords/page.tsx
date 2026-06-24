import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { NewsKeywordManager } from "@/features/news/components/news-keyword-manager";
import { listNewsKeywords } from "@/features/news/keyword-service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "뉴스 키워드 관리" };

export default async function AdminNewsKeywordsPage() {
  await requireRole(["ADMIN"]);
  const keywords = await listNewsKeywords();

  return (
    <div className="space-y-6">
      <PageHeader
        title="뉴스 키워드 관리"
        description="최대 50개 키워드를 등록하면 AI 에이전트가 매일 선정·검색·요약합니다."
      />
      <NewsKeywordManager keywords={keywords} />
    </div>
  );
}
