import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AiChat } from "@/features/ai/components/ai-chat";
import { listUserConversations } from "@/features/ai/conversation-service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "매종이 · AI 에이전트" };

export default async function AiAgentPage() {
  const user = await requireUser();
  const conversations = await listUserConversations(user.id);

  return (
    <div>
      <PageHeader
        title="매종이"
        description="주식회사프렌치메종 신입사원 AI — 업무 지원·뉴스·시장 컨설팅·마케팅 전략·전자결재 기안 도우미. 담당 업무에 맞춰 응대하며, 대화는 개인별로 저장되고 7일 후 자동 삭제됩니다."
      />
      <AiChat
        canSync={user.role === "ADMIN"}
        initialConversations={conversations.map((c) => ({
          id: c.id,
          title: c.title ?? "새 대화",
          updatedAt: c.updatedAt.toISOString(),
          messageCount: c._count.messages,
        }))}
      />
    </div>
  );
}
