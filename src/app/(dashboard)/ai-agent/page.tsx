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
        description="프렌치메종 신입사원 AI — 시장조사·뉴스·기안 조언·사내 자료 학습 도우미. 대화는 개인별로 저장되며 7일 후 자동 삭제됩니다."
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
