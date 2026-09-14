import "server-only";

import { prisma } from "@/lib/prisma";
import type { ChatMessage, ChatSource } from "@/lib/ai/chat";
import type { NewsMindmapPayload } from "@/lib/news/mindmap-types";
import { serializeAssistantMeta } from "@/features/ai/message-meta";
import { purgeExpiredAiConversations } from "@/features/ai/conversation-cleanup";

const HISTORY_LIMIT = 40;

export async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
) {
  if (conversationId) {
    const existing = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: HISTORY_LIMIT },
      },
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
  mindmap?: NewsMindmapPayload,
) {
  const conv = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { title: true, _count: { select: { messages: true } } },
  });

  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: "user", content: userContent },
      {
        conversationId,
        role: "assistant",
        content: assistantContent,
        sources: serializeAssistantMeta(sources, mindmap) as
          | object
          | undefined,
      },
    ],
  });

  const titleUpdate =
    conv &&
    (conv.title === "새 대화" || !conv.title) &&
    conv._count.messages === 0
      ? { title: userContent.replace(/\s+/g, " ").slice(0, 40) }
      : {};

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date(), ...titleUpdate },
  });
}

export async function loadConversationHistory(
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
  const conv = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: HISTORY_LIMIT },
    },
  });
  if (!conv) return [];
  return conv.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

export async function getConversationDetail(conversationId: string, userId: string) {
  return prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: HISTORY_LIMIT },
    },
  });
}

export async function listUserConversations(userId: string, limit = 30) {
  // 조회 시에도 만료분 lazy purge
  await purgeExpiredAiConversations().catch(() => 0);

  return prisma.aiConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function deleteConversation(conversationId: string, userId: string) {
  const existing = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.aiConversation.delete({ where: { id: conversationId } });
  return true;
}

export async function createEmptyConversation(userId: string) {
  return prisma.aiConversation.create({
    data: { userId, title: "새 대화" },
    select: { id: true, title: true, updatedAt: true },
  });
}
