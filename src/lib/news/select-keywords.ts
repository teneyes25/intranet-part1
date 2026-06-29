import "server-only";

import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "@/lib/ai/config";
import type { NewsKeyword } from "@prisma/client";

/**
 * 등록된 키워드(최대 50) 중 오늘 수집할 키워드를 AI가 선정한다.
 */
export async function selectKeywordsForToday(
  keywords: NewsKeyword[],
): Promise<NewsKeyword[]> {
  if (keywords.length === 0) return [];
  if (keywords.length <= 5) return keywords;

  if (!OPENAI_API_KEY) {
    return fallbackSelect(keywords);
  }

  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const list = keywords
    .map((k, i) => `${i + 1}. [${k.category}] ${k.keyword}`)
    .join("\n");

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "당신은 사내 인트라넷 뉴스 큐레이터입니다. 오늘 수집할 키워드 번호를 JSON으로 반환하세요.",
          },
          {
            role: "user",
            content: `오늘: ${today}\n\n키워드:\n${list}\n\n업종·분야 균형으로 최대 8개 선택 → {"indices":[1,3,...]}`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { indices?: number[] };
    const indices = (parsed.indices ?? [])
      .map((n) => n - 1)
      .filter((i) => i >= 0 && i < keywords.length);

    if (indices.length === 0) return fallbackSelect(keywords);
    return [...new Set(indices)].map((i) => keywords[i]!).slice(0, 8);
  } catch (e) {
    console.error("[news] AI 키워드 선정 실패:", e);
    return fallbackSelect(keywords);
  }
}

function fallbackSelect(keywords: NewsKeyword[]): NewsKeyword[] {
  const byCat = new Map<string, NewsKeyword[]>();
  for (const k of keywords) {
    const arr = byCat.get(k.category) ?? [];
    arr.push(k);
    byCat.set(k.category, arr);
  }
  const picked: NewsKeyword[] = [];
  for (const cat of byCat.keys()) {
    const arr = byCat.get(cat);
    if (arr?.[0]) picked.push(arr[0]);
    if (picked.length >= 8) break;
  }
  return picked.length > 0 ? picked : keywords.slice(0, 3);
}
