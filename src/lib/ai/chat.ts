import "server-only";

import { prisma } from "@/lib/prisma";
import { embedText } from "./embeddings";
import { hybridSearch, keywordOnlySearch } from "./hybrid-search";
import { type SearchResult } from "./vector-store";
import { RETRIEVE_TOP_K } from "./config";
import { getLlmRuntimeConfig } from "./llm-runtime";
import {
  AI_AGENT_NAME,
  buildChatSystemPrompt,
  GREETING_MESSAGE,
} from "./persona";
import { getLearningSettings } from "@/features/ai/knowledge-service";
import { fetchSeoulWeatherSummary } from "./weather";

export { GREETING_MESSAGE };

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
  | "greeting"
  | "weather"
  | "casual"
  | "news_summary"
  | "market_report"
  | "draft_advice"
  | "related_cases"
  | "general";

function detectIntent(question: string): ChatIntent {
  const q = question.toLowerCase().trim();
  if (
    /^(안녕|안녕하세요|하이|헬로|hello|hi[!?.\s]*$|반가워|좋은\s*(아침|오후|저녁)|자기소개|너는\s*누구|이름이\s*뭐|소개\s*해)/i.test(
      q,
    ) ||
    /자기\s*소개|너는\s*누구|이름이\s*뭐야|(매종이|메종이|부메종)\s*(야|인가|소개)/.test(q)
  ) {
    return "greeting";
  }
  if (/날씨|기온|비\s*올|우산|습도|바람|기상/.test(q)) {
    return "weather";
  }
  if (
    /시장조사|시장.?동향|월간.?보고|마켓.?리포트|market.?report|시장.?분석|마케팅.?전략|침구|매트리스/.test(
      q,
    )
  ) {
    return "market_report";
  }
  if (
    /뉴스|news|최신.*(소식|기사|뉴스)|오늘.*뉴스|이번.*뉴스|뉴스.*요약|요약.*뉴스|정치|시사/.test(
      q,
    )
  ) {
    return "news_summary";
  }
  if (
    /기안|공문|결재.*조언|기안서|문서.*작성|편람|행정안전부|6하|품의|보고서.?작성/.test(
      q,
    )
  ) {
    return "draft_advice";
  }
  if (/사례|관련.*(자료|사례|글|게시)|유사|참고|비슷한|선례|전례|찾아/.test(q)) {
    return "related_cases";
  }
  if (
    /심심|농담|재미|취미|점심|저녁|주말|응원|고마워|감사|어떻게\s*지내|뭐해|뭐하니/.test(
      q,
    )
  ) {
    return "casual";
  }
  return "general";
}

async function fetchLatestNews(limit = 5, political = false) {
  const board = await prisma.board.findUnique({ where: { key: "news" } });
  if (!board) return [];
  return prisma.post.findMany({
    where: {
      boardId: board.id,
      NOT: { category: "시장조사" },
      ...(political
        ? {
            OR: [
              { title: { contains: "정치" } },
              { title: { contains: "국회" } },
              { title: { contains: "대통령" } },
              { content: { contains: "정치" } },
              { category: { contains: "정치" } },
            ],
          }
        : {}),
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
  if (results.length === 0) return "(관련 내부 자료 없음)";
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
    case "greeting":
      return "밝게 짧게 인사·자기소개 후 무엇을 도와드릴지 물어보세요.";
    case "weather":
      return "제공된 날씨 관측값을 바탕으로 오늘 날씨를 친절히 알려주세요. 옷차림·우산 팁을 한 줄 덧붙이세요.";
    case "casual":
      return "가벼운 일상 대화로 밝고 짧게 응대하세요.";
    case "news_summary":
      return "뉴스를 시간순으로 요약하고 핵심만 3~5개 bullet로 정리하세요. 정치·시사면 쟁점을 균형 있게 요약하세요.";
    case "market_report":
      return "침구·매트리스·홈리빙 시장과 마케팅 관점에서 동향·시사점을 정리하세요.";
    case "draft_advice":
      return "기안서 작성 조언으로 6하원칙·공문 구성·표현을 신입사원답게 친절히 제안하세요.";
    case "related_cases":
      return "유사 사례/관련 자료를 비교하고 공통점·차이점을 간략히 설명하세요.";
    default:
      return "";
  }
}

async function retrieveContext(
  question: string,
  k: number,
): Promise<SearchResult[]> {
  try {
    const qvec = await embedText(question);
    return await hybridSearch(question, qvec, k);
  } catch (e) {
    console.error("[ai/chat] embed/hybrid failed, keyword fallback:", e);
    try {
      return await keywordOnlySearch(question, k);
    } catch (e2) {
      console.error("[ai/chat] keyword search failed:", e2);
      return [];
    }
  }
}

async function generateWithLlm(
  question: string,
  context: string,
  history: ChatMessage[],
  intent: ChatIntent,
  jobTitles: string[],
): Promise<string> {
  const cfg = await getLlmRuntimeConfig();
  if (!cfg.apiKey && cfg.provider !== "ollama") {
    throw new Error("LLM API 키가 없습니다.");
  }
  const apiKey = cfg.apiKey || "ollama";
  const base = cfg.baseUrl.replace(/\/$/, "");
  const system = `${await buildChatSystemPrompt(jobTitles)}\n${intentHint(intent)}`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      temperature: intent === "casual" || intent === "greeting" ? 0.55 : 0.35,
      messages: [
        { role: "system", content: system },
        ...history.slice(-6),
        {
          role: "user",
          content: `참고 자료:\n${context}\n\n질문: ${question}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM 응답 오류: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("LLM 응답이 비어 있습니다.");
  return answer;
}

export async function answerQuestion(
  question: string,
  history: ChatMessage[] = [],
  opts?: { userId?: string; jobTitles?: string[] },
): Promise<ChatResult> {
  let jobTitles = opts?.jobTitles ?? [];
  if (opts?.userId && jobTitles.length === 0) {
    try {
      const jobs = await prisma.userJob.findMany({
        where: { userId: opts.userId },
        include: { jobCategory: { select: { name: true } } },
      });
      jobTitles = jobs.map((j) => j.jobCategory.name);
    } catch (e) {
      console.error("[ai/chat] job lookup failed:", e);
    }
  }

  const settings = await getLearningSettings();
  const intent = detectIntent(question);
  const cfg = await getLlmRuntimeConfig();
  const canGenerate = Boolean(cfg.apiKey) || cfg.provider === "ollama";

  const tryLlm = async (context: string, sources: ChatSource[] = []) => {
    if (!canGenerate) return null;
    try {
      const answer = await generateWithLlm(
        question,
        context,
        history,
        intent,
        jobTitles,
      );
      return { answer, sources, mode: "generative" as const, intent };
    } catch (e) {
      console.error("[ai/chat] LLM failed:", e);
      return null;
    }
  };

  if (intent === "greeting") {
    const r = await tryLlm("(인사/자기소개)");
    if (r) return r;
    return {
      answer: GREETING_MESSAGE,
      sources: [],
      mode: "extractive",
      intent,
    };
  }

  if (intent === "weather" && settings.allowCasualChat) {
    const weather = await fetchSeoulWeatherSummary();
    const context = weather
      ? `실시간 날씨 관측:\n${weather}`
      : "(실시간 날씨 조회 실패 — 일반 안내로 답하세요)";
    const r = await tryLlm(context);
    if (r) return r;
    if (weather) {
      return {
        answer: `${AI_AGENT_NAME}예요. 서울 기준 날씨예요.\n\n${weather}`,
        sources: [],
        mode: "extractive",
        intent,
      };
    }
  }

  if (intent === "casual" && settings.allowCasualChat) {
    const r = await tryLlm("(일상 대화 — 내부 검색 생략)");
    if (r) return r;
  }

  let results: SearchResult[] = [];

  try {
    if (intent === "news_summary") {
      const political = /정치|시사|국회|대통령/.test(question);
      const news = await fetchLatestNews(6, political);
      results = postsToResults(news, political ? "시사뉴스" : "뉴스");
      if (results.length === 0) {
        results = await retrieveContext(question, RETRIEVE_TOP_K);
      }
    } else if (intent === "market_report") {
      const reports = await fetchLatestMarketReports(3);
      results = postsToResults(reports, "시장조사");
      const more = await retrieveContext(question, RETRIEVE_TOP_K);
      const seen = new Set(results.map((r) => r.sourceId));
      for (const r of more) {
        if (!seen.has(r.sourceId)) results.push(r);
      }
      results = results.slice(0, RETRIEVE_TOP_K + 3);
    } else if (intent !== "weather" && intent !== "casual") {
      const k =
        intent === "related_cases" || intent === "draft_advice"
          ? RETRIEVE_TOP_K + 3
          : RETRIEVE_TOP_K;
      results = await retrieveContext(question, k);
    }
  } catch (e) {
    console.error("[ai/chat] retrieval failed:", e);
    results = [];
  }

  const sources: ChatSource[] = results.map((r) => ({
    title: r.title,
    url: r.url,
    score: r.score,
    snippet: r.content.replace(/\s+/g, " ").slice(0, 200),
  }));

  // 뉴스/일상인데 자료가 없어도 LLM 허용 시 생성
  if (
    results.length === 0 &&
    settings.allowCasualChat &&
    (intent === "news_summary" || intent === "general" || intent === "casual")
  ) {
    const r = await tryLlm(
      intent === "news_summary"
        ? "(사내 수집 뉴스 없음 — 일반 시사 요약으로 답하되 한계를 밝히세요)"
        : buildContext(results),
      sources,
    );
    if (r) return r;
  }

  const generated = await tryLlm(buildContext(results), sources);
  if (generated) return generated;

  if (results.length === 0) {
    return {
      answer: `${AI_AGENT_NAME}예요. 지금은 관련 내부 자료를 찾지 못했거나 LLM 연결이 필요해요. Ollama/지식 동기화를 확인해 주세요.`,
      sources: [],
      mode: "extractive",
      intent,
    };
  }

  return {
    answer: buildExtractiveAnswer(results),
    sources,
    mode: "extractive",
    intent,
  };
}
