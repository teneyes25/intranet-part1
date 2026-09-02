import "server-only";

import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "@/lib/ai/config";
import type { NewsItem } from "./sources";

/** 요약 문장에서 긴 URL·괄호 URL 제거 (레이아웃 깨짐 방지) */
export function scrubNewsSummaryLine(line: string): string {
  return line
    .replace(/\(\s*https?:\/\/[^)]+\)/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}

/** 저장된 뉴스 HTML에서 본문용 긴 URL 제거 (href 속성은 유지) */
export function scrubNewsContentHtml(html: string): string {
  return html
    .replace(/\(\s*https?:\/\/[^)]+\)/gi, "")
    .replace(/>([^<]*)</g, (_m, text: string) => {
      const cleaned = scrubNewsSummaryLine(text);
      return `>${cleaned}<`;
    })
    .replace(/\s{2,}/g, " ");
}

/** 설명/제목에서 문장 단위로 3줄 요약을 추출(폴백). */
function fallbackSummary(item: NewsItem): string[] {
  const text = scrubNewsSummaryLine(item.description || item.title);
  const sentences = text
    .split(/(?<=[.!?。…])\s+/)
    .map((s) => scrubNewsSummaryLine(s))
    .filter((s) => s.length > 0);

  const lines = (sentences.length > 0 ? sentences : [text]).slice(0, 3);
  const sourceName = scrubNewsSummaryLine(item.source ?? "뉴스") || "뉴스";
  return [...lines, `출처: ${sourceName}`].filter(Boolean);
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
            "당신은 뉴스 요약 기자입니다. 주어진 기사를 한국어로 정확히 3줄(각 줄 한 문장)로 핵심만 요약하세요. 과장/추측 없이 사실만, 각 줄은 줄바꿈으로 구분하고 번호나 불릿은 붙이지 마세요. URL·링크·주소는 절대 출력하지 마세요. 마지막 줄에 반드시 출처를 「출처: [매체명]」 형식으로만 포함하세요 (URL 금지).",
        },
        {
          role: "user",
          content: `제목: ${item.title}\n매체: ${item.source ?? "뉴스"}\n내용: ${item.description}`,
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
    .map((l) => scrubNewsSummaryLine(l.replace(/^\s*[-•\d.]+\s*/, "")))
    .filter(Boolean)
    .slice(0, 4);
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
