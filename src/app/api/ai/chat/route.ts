import { NextResponse } from "next/server";
import { z } from "zod";

import { answerQuestion, type ChatMessage } from "@/lib/ai/chat";
import type { Role } from "@/lib/auth/roles";
import {
  appendAiMessages,
  getOrCreateConversation,
  loadConversationHistory,
} from "@/features/ai/conversation-service";
import { writeAudit } from "@/lib/audit/service";
import { withApiGuard, parseJsonBody } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const chatSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  conversationId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(6)
    .optional()
    .default([]),
});

export const POST = withApiGuard({ tier: "ai" }, async (req, { session, ip }) => {
  const parsed = await parseJsonBody(req, chatSchema);
  if ("error" in parsed) return parsed.error;

  const { question, history, conversationId } = parsed.data;

  try {
    const conv = await getOrCreateConversation(session!.user.id, conversationId);
    const dbHistory = await loadConversationHistory(conv.id, session!.user.id);
    const mergedHistory =
      dbHistory.length > 0 ? dbHistory : (history as ChatMessage[]);

    const result = await answerQuestion(question, mergedHistory, {
      role: session!.user.role as Role,
      dealerId: session!.user.dealerId ?? null,
    });
    await appendAiMessages(conv.id, question, result.answer, result.sources);

    void writeAudit({
      action: "AI_CHAT",
      userId: session!.user.id,
      userEmail: session!.user.email ?? undefined,
      ip,
      detail: question.slice(0, 200),
    });
    return NextResponse.json({ ...result, conversationId: conv.id });
  } catch (e) {
    console.error("[api/ai/chat]", e);
    return NextResponse.json(
      { error: "AI 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
});
