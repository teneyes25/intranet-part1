import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AiChat } from "@/features/ai/components/ai-chat";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "AI 에이전트" };

export default async function AiAgentPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="AI 에이전트"
        description="사내 게시물·문서를 학습한 RAG 기반 업무 도우미입니다."
      />
      <AiChat canSync={user.role === "ADMIN"} />
    </div>
  );
}
