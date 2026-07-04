import type { Metadata } from "next";

import { PageHero } from "@/components/layout/page-hero";
import { AiChat } from "@/features/ai/components/ai-chat";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "AI 에이전트" };

export default async function AiAgentPage() {
  const user = await requireUser();

  return (
    <div className="page-shell">
      <PageHero
        variant="plain"
        eyebrow="AI"
        title="AI 에이전트"
        description="사내 게시물·문서를 학습한 RAG 기반 업무 도우미입니다. 마크다운 답변, 출처, 텍스트 파일 첨부를 지원합니다."
        badge="Hybrid RAG"
      />
      <AiChat canSync={user.role === "ADMIN"} />
    </div>
  );
}
