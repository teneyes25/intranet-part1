import "server-only";

import { prisma } from "@/lib/prisma";
import { embedText } from "./embeddings";
import { hybridSearch } from "./hybrid-search";
import { similaritySearch, type SearchResult, type SearchScope } from "./vector-store";
import { canAccessChunk, type RagScope } from "./scope";
import type { Role } from "@/lib/auth/roles";
import {
  RETRIEVE_TOP_K,
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSource {
  title: string | null;
  url: string | null;
  score: number;
  snippet: string;
}

export interface ChatResult {
  answer: string;
  sources: ChatSource[];
  mode: "generative" | "extractive";
  intent?: string;
}

type ChatIntent = "news_summary" | "related_cases" | "general";

const SYSTEM_PROMPT = `당신은 사내 인트라넷 전용 AI 어시스턴트입니다.
아래에 제공된 "내부 자료"만 근거로 한국어로 정확하고 간결하게 답변하세요.
자료에 근거가 없으면 모른다고 답하고 추측하지 마세요.
답변에 사용한 자료는 [1], [2] 처럼 번호로 인용하세요.`;

function detectIntent(question: string): ChatIntent {
  const q = question.toLowerCase();
  if (
    /뉴스|news|최신.*(소식|기사|뉴스)|오늘.*뉴스|이번.*뉴스|뉴스.*요약|요약.*뉴스/.test(
      q,
    )
  ) {
    return "news_summary";
  }
  if (/행정안전부|행정.*편람|공문|기안서.*작성|정책.*기반/.test(q)) {
    return "related_cases";
  }
  if (/사례|관련.*(자료|사례|글|게시)|유사|참고|비슷한|선례|전례|찾아/.test(q)) {
    return "related_cases";
  }
  return "general";
}

async function fetchLatestNews(limit = 5) {
  const board = await prisma.board.findUnique({ where: { key: "news" } });
  if (!board) return [];
  return prisma.post.findMany({
    where: { boardId: board.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, content: true, category: true, createdAt: true },
  });
}

function newsToResults(
  posts: { id: string; title: string; content: string; category: string | null }[],
): SearchResult[] {
  return posts.map((p, i) => ({
    id: `news:${p.id}`,
    sourceType: "post",
    sourceId: p.id,
    title: `[뉴스${p.category ? `·${p.category}` : ""}] ${p.title}`,
    url: `/boards/news/${p.id}`,
    content: p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    score: 1 - i * 0.05,
  }));
}

function buildContext(results: SearchResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title ?? "(제목 없음)"}\n${r.content}`)
    .join("\n\n");
}

function buildExtractiveAnswer(results: SearchResult[]): string {
  const lines = results.map((r, i) => {
    const snippet = r.content.replace(/\s+/g, " ").slice(0, 280);
    return `[${i + 1}] ${r.title ?? "내부 자료"}\n${snippet}…`;
  });
  return [
    "생성형 모델이 일시적으로 사용 불가하여, 관련 내부 자료를 발췌해 드립니다.",
    "",
    ...lines,
  ].join("\n");
}

async function generateWithOpenAI(
  question: string,
  context: string,
  history: ChatMessage[],
  intent: ChatIntent,
): Promise<string> {
  const intentHint =
    intent === "news_summary"
      ? "최신 뉴스를 시간순으로 요약하고 핵심만 3~5개 bullet로 정리하세요."
      : intent === "related_cases"
        ? "유사 사례/관련 자료를 비교하고 공통점·차이점을 간략히 설명하세요."
        : "";

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n${intentHint}` },
        ...history.slice(-6),
        {
          role: "user",
          content: `내부 자료:\n${context}\n\n질문: ${question}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI 응답 오류: ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("OpenAI 응답이 비어 있습니다.");
  return answer;
}

function filterByScope(results: SearchResult[], scope?: RagScope): SearchResult[] {
  if (!scope) return results;
  return results.filter((r) =>
    canAccessChunk(scope, { dealerId: r.dealerId, minRole: r.minRole }),
  );
}

export async function answerQuestion(
  question: string,
  history: ChatMessage[] = [],
  scope?: { role: Role; dealerId?: string | null },
): Promise<ChatResult> {
  const intent = detectIntent(question);
  let results: SearchResult[] = [];
  const searchScope: SearchScope | undefined = scope
    ? { role: scope.role, dealerId: scope.dealerId ?? null }
    : undefined;
  const ragScope: RagScope | undefined = scope
    ? { role: scope.role, dealerId: scope.dealerId ?? null }
    : undefined;

  if (intent === "news_summary") {
    const news = await fetchLatestNews(6);
    results = newsToResults(news);
    if (results.length === 0) {
      const qvec = await embedText(question);
      results = await similaritySearch(qvec, RETRIEVE_TOP_K, "post", searchScope);
    }
  } else {
    const qvec = await embedText(question);
    const k = intent === "related_cases" ? RETRIEVE_TOP_K + 3 : RETRIEVE_TOP_K;
    results = await hybridSearch(question, qvec, k, undefined, searchScope);
  }

  results = filterByScope(results, ragScope);

  const sources: ChatSource[] = results.map((r) => ({
    title: r.title,
    url: r.url,
    score: r.score,
    snippet: r.content.replace(/\s+/g, " ").slice(0, 200),
  }));

  if (results.length === 0) {
    return {
      answer:
        "관련된 내부 자료를 찾지 못했습니다. 게시글을 등록하거나 관리자에게 지식 동기화를 요청해 주세요.",
      sources: [],
      mode: "extractive",
      intent,
    };
  }

  if (OPENAI_API_KEY) {
    try {
      const answer = await generateWithOpenAI(
        question,
        buildContext(results),
        history,
        intent,
      );
      return { answer, sources, mode: "generative", intent };
    } catch (e) {
      console.error("[ai/chat] OpenAI 생성 실패, 추출형으로 폴백:", e);
    }
  }

  return {
    answer: buildExtractiveAnswer(results),
    sources,
    mode: "extractive",
    intent,
  };
}
