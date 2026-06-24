import "server-only";

import { prisma } from "@/lib/prisma";
import type { ChatMessage, ChatSource } from "@/lib/ai/chat";

export async function getOrCreateConversation(userId: string, conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
    if (existing) return existing;
  }
  return prisma.aiConversation.create({
    data: { userId, title: "새 대화" },
    include: { messages: true },
  });
}

export async function appendAiMessages(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  sources?: ChatSource[],
) {
  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: "user", content: userContent },
      {
        conversationId,
        role: "assistant",
        content: assistantContent,
        sources: sources ? (sources as object) : undefined,
      },
    ],
  });
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

export async function loadConversationHistory(
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const conv = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } },
  });
  if (!conv) return [];
  return conv.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

export async function listUserConversations(userId: string, limit = 10) {
  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
  });
}
