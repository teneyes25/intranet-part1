import "server-only";

import { prisma } from "@/lib/prisma";
import { embedText } from "./embeddings";
import { hybridSearch } from "./hybrid-search";
import { similaritySearch, type SearchResult } from "./vector-store";
import {
  RETRIEVE_TOP_K,
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "./config";
import { CHAT_SYSTEM_PROMPT, AI_AGENT_NAME } from "./persona";

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

type ChatIntent =
  | "news_summary"
  | "market_report"
  | "draft_advice"
  | "related_cases"
  | "general";

function detectIntent(question: string): ChatIntent {
  const q = question.toLowerCase();
  if (
    /시장조사|시장.?동향|월간.?보고|마켓.?리포트|market.?report|시장.?분석/.test(
      q,
    )
  ) {
    return "market_report";
  }
  if (
    /뉴스|news|최신.*(소식|기사|뉴스)|오늘.*뉴스|이번.*뉴스|뉴스.*요약|요약.*뉴스/.test(
      q,
    )
  ) {
    return "news_summary";
  }
  if (
    /기안|공문|결재.*조언|기안서|문서.*작성|편람|행정안전부/.test(q)
  ) {
    return "draft_advice";
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
    where: {
      boardId: board.id,
      NOT: { category: "시장조사" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, content: true, category: true, createdAt: true },
  });
}

async function fetchLatestMarketReports(limit = 3) {
  const board = await prisma.board.findUnique({ where: { key: "news" } });
  if (!board) return [];
  return prisma.post.findMany({
    where: { boardId: board.id, category: "시장조사" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, content: true, category: true },
  });
}

function postsToResults(
  posts: { id: string; title: string; content: string; category: string | null }[],
  prefix: string,
): SearchResult[] {
  return posts.map((p, i) => ({
    id: `news:${p.id}`,
    sourceType: "post",
    sourceId: p.id,
    title: `[${prefix}${p.category ? `·${p.category}` : ""}] ${p.title}`,
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
    `${AI_AGENT_NAME}예요. 생성형 모델이 일시적으로 사용 불가하여, 관련 내부 자료를 발췌해 드릴게요.`,
    "",
    ...lines,
  ].join("\n");
}

function intentHint(intent: ChatIntent): string {
  switch (intent) {
    case "news_summary":
      return "최신 뉴스를 시간순으로 요약하고 핵심만 3~5개 bullet로 정리하세요.";
    case "market_report":
      return "시장조사·월간 보고서 관점에서 동향과 시사점을 정리하세요. 보고서 본문이 있으면 요약을 우선하세요.";
    case "draft_advice":
      return "기안서 작성 조언으로, 구성·표현·주의점을 신입사원답게 친절히 제안하세요.";
    case "related_cases":
      return "유사 사례/관련 자료를 비교하고 공통점·차이점을 간략히 설명하세요.";
    default:
      return "";
  }
}

async function generateWithOpenAI(
  question: string,
  context: string,
  history: ChatMessage[],
  intent: ChatIntent,
): Promise<string> {
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.35,
      messages: [
        { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n${intentHint(intent)}` },
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

export async function answerQuestion(
  question: string,
  history: ChatMessage[] = [],
): Promise<ChatResult> {
  const intent = detectIntent(question);
  let results: SearchResult[] = [];

  if (intent === "news_summary") {
    const news = await fetchLatestNews(6);
    results = postsToResults(news, "뉴스");
    if (results.length === 0) {
      const qvec = await embedText(question);
      results = await similaritySearch(qvec, RETRIEVE_TOP_K);
    }
  } else if (intent === "market_report") {
    const reports = await fetchLatestMarketReports(3);
    results = postsToResults(reports, "시장조사");
    const qvec = await embedText(question);
    const more = await hybridSearch(question, qvec, RETRIEVE_TOP_K);
    const seen = new Set(results.map((r) => r.sourceId));
    for (const r of more) {
      if (!seen.has(r.sourceId)) results.push(r);
    }
    results = results.slice(0, RETRIEVE_TOP_K + 3);
  } else {
    const qvec = await embedText(question);
    const k =
      intent === "related_cases" || intent === "draft_advice"
        ? RETRIEVE_TOP_K + 3
        : RETRIEVE_TOP_K;
    results = await hybridSearch(question, qvec, k);
  }

  const sources: ChatSource[] = results.map((r) => ({
    title: r.title,
    url: r.url,
    score: r.score,
    snippet: r.content.replace(/\s+/g, " ").slice(0, 200),
  }));

  if (results.length === 0) {
    return {
      answer: `${AI_AGENT_NAME}예요. 관련된 내부 자료를 아직 찾지 못했어요. 게시글·문서함·전자결재를 등록하시거나, 관리자에게 지식 동기화를 요청해 주세요.`,
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
