import "server-only";

import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "@/lib/ai/config";
import type { NewsItem } from "./sources";

/** 설명/제목에서 문장 단위로 3줄 요약을 추출(폴백). */
function fallbackSummary(item: NewsItem): string[] {
  const text = (item.description || item.title).trim();
  const sentences = text
    .split(/(?<=[.!?。…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lines = (sentences.length > 0 ? sentences : [text]).slice(0, 3);
  const withSource = [...lines, `출처: ${item.source ?? "뉴스"} (${item.link})`];
  return lines.length > 0 ? withSource.slice(0, 4) : [item.title];
}

async function summarizeWithOpenAI(item: NewsItem): Promise<string[]> {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "당신은 뉴스 요약 기자입니다. 주어진 기사를 한국어로 정확히 3줄(각 줄 한 문장)로 핵심만 요약하세요. 과장/추측 없이 사실만, 각 줄은 줄바꿈으로 구분하고 번호나 불릿은 붙이지 마세요. 마지막 줄에 반드시 출처를 「출처: [매체명]」 형식으로 포함하세요.",
        },
        {
          role: "user",
          content: `제목: ${item.title}\n출처 URL: ${item.link}\n매체: ${item.source ?? "뉴스"}\n내용: ${item.description}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI 요약 오류: ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI 요약 비어 있음");

  return content
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-•\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** 기사 3줄 요약. OpenAI 키가 있으면 생성형, 없으면 설명 기반 폴백. */
export async function summarizeNews(item: NewsItem): Promise<string[]> {
  if (OPENAI_API_KEY) {
    try {
      const lines = await summarizeWithOpenAI(item);
      if (lines.length > 0) return lines;
    } catch (e) {
      console.error("[news] OpenAI 요약 실패, 폴백:", e);
    }
  }
  return fallbackSummary(item);
}
