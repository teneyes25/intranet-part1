import { NextResponse } from "next/server";
import { z } from "zod";

import { answerQuestion, type ChatMessage } from "@/lib/ai/chat";
import { ensureLlmReady } from "@/lib/ai/llm-ensure";
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
    .max(12)
    .optional()
    .default([]),
});

export const POST = withApiGuard({ tier: "ai" }, async (req, { session, ip }) => {
  const parsed = await parseJsonBody(req, chatSchema);
  if ("error" in parsed) return parsed.error;

  const { question, history, conversationId } = parsed.data;

  try {
    await ensureLlmReady();
    const conv = await getOrCreateConversation(session!.user.id, conversationId);
    const dbHistory = await loadConversationHistory(conv.id, session!.user.id);
    const mergedHistory =
      dbHistory.length > 0 ? dbHistory : (history as ChatMessage[]);

    const result = await answerQuestion(question, mergedHistory, {
      userId: session!.user.id,
    });
    try {
      await appendAiMessages(conv.id, question, result.answer, result.sources);
    } catch (persistError) {
      console.error("[api/ai/chat] persist failed:", persistError);
    }

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
    const detail = e instanceof Error ? e.message : "";
    const hint =
      /LLM|api.?key|fetch|ECONNREFUSED|timeout/i.test(detail)
        ? " LLM 연결(Ollama/OpenAI) 또는 API 키를 관리자 → 메종이 LLM에서 확인해 주세요."
        : /임베딩|embed|onnx|transformers/i.test(detail)
          ? " 지식 검색 준비 중이거나 실패했습니다. 잠시 후 다시 시도해 주세요."
          : "";
    return NextResponse.json(
      { error: `AI 처리 중 오류가 발생했습니다.${hint}` },
      { status: 500 },
    );
  }
});
