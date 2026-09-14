import "server-only";

import { prisma } from "@/lib/prisma";
import { getLlmRuntimeConfig } from "@/lib/ai/llm-runtime";
import { AI_AGENT_NAME } from "@/lib/ai/persona-public";
import { assembleMindmapPayload } from "@/lib/news/mindmap-format";
import type { MindmapNode, NewsMindmapPayload, NewsPeriod } from "@/lib/news/mindmap-types";
const NEWS_BOARD_KEY = "news";

export type NewsMindmapArticle = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: Date;
};

const MAX_ARTICLES = 40;

export async function fetchNewsInPeriod(opts: {
  from: Date;
  to: Date;
  keyword?: string;
  includeMarket?: boolean;
  limit?: number;
}): Promise<NewsMindmapArticle[]> {
  const board = await prisma.board.findUnique({
    where: { key: NEWS_BOARD_KEY },
    select: { id: true },
  });
  if (!board) return [];

  const keyword = opts.keyword?.trim();
  return prisma.post.findMany({
    where: {
      boardId: board.id,
      createdAt: { gte: opts.from, lte: opts.to },
      ...(opts.includeMarket ? {} : { NOT: { category: "시장조사" } }),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { content: { contains: keyword } },
              { category: { contains: keyword } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? MAX_ARTICLES,
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      createdAt: true,
    },
  });
}

function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackTree(
  title: string,
  posts: NewsMindmapArticle[],
): MindmapNode {
  const groups = new Map<string, MindmapNode[]>();
  posts.forEach((p, i) => {
    const cat = p.category?.trim() || "기타";
    const list = groups.get(cat) ?? [];
    list.push({ label: p.title, source: i + 1 });
    groups.set(cat, list);
  });
  return {
    label: title,
    children: [...groups.entries()].map(([label, children]) => ({
      label,
      children,
    })),
  };
}

function parseTreeJson(raw: string): MindmapNode | null {
  const trimmed = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as {
      title?: string;
      label?: string;
      children?: MindmapNode[];
    };
    const label = String(parsed.title || parsed.label || "").trim();
    if (!label && !parsed.children?.length) return null;
    return {
      label: label || "뉴스",
      children: Array.isArray(parsed.children) ? parsed.children : [],
    };
  } catch {
    return null;
  }
}

async function llmTree(opts: {
  title: string;
  period: NewsPeriod;
  keyword?: string;
  posts: NewsMindmapArticle[];
}): Promise<MindmapNode | null> {
  const cfg = await getLlmRuntimeConfig();
  if (!cfg.apiKey && cfg.provider !== "ollama") return null;
  const apiKey = cfg.apiKey || "ollama";
  const base = cfg.baseUrl.replace(/\/$/, "");

  const catalog = opts.posts
    .map((p, i) => {
      const body = plainText(p.content).slice(0, 180);
      return `[${i + 1}] ${p.createdAt.toISOString().slice(0, 10)} · ${p.category ?? "뉴스"} · ${p.title}\n${body}`;
    })
    .join("\n\n");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "사내 수집 뉴스만으로 마인드맵 트리를 만듭니다. 제공된 기사에 없는 사실을 만들지 마세요. JSON만 출력하세요.",
        },
        {
          role: "user",
          content: `기간: ${opts.period.label}
주제 힌트: ${opts.keyword || "(전체)"}
기사 목록:
${catalog}

다음 형식의 JSON만 출력:
{"title":"${opts.title}","children":[{"label":"주제","children":[{"label":"기사 핵심 한 줄","source":1}]}]}
- children은 3~8개 주제로
- 잎 노드는 source에 기사 번호를 넣으세요
- 모든 기사를 최소 한 번은 넣으세요`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  return parseTreeJson(content);
}

export async function buildNewsMindmap(opts: {
  question: string;
  period: NewsPeriod;
  posts: NewsMindmapArticle[];
  keyword?: string;
}): Promise<{ payload: NewsMindmapPayload; intro: string }> {
  const title = opts.keyword
    ? `${opts.period.label} ${opts.keyword} 뉴스`
    : `${opts.period.label} 뉴스`;
  let tree: MindmapNode | null = null;
  try {
    tree = await llmTree({ ...opts, title });
  } catch (e) {
    console.error("[news-mindmap] LLM tree failed:", e);
  }
  if (!tree?.children?.length) {
    tree = fallbackTree(title, opts.posts);
  }
  if (!tree.label) tree.label = title;

  const payload = assembleMindmapPayload({
    title,
    periodLabel: opts.period.label,
    from: opts.period.from,
    to: opts.period.to,
    articleCount: opts.posts.length,
    tree,
  });

  const intro = [
    `${AI_AGENT_NAME}예요. ${opts.period.label} 사내 수집 뉴스 ${opts.posts.length}건을 주제로 묶어 마인드맵을 그렸어요.`,
    opts.keyword ? `검색어: ${opts.keyword}` : "",
    "아래에서 트리를 확인하고, Markdown·OPML로 받아 XMind 등에서 열 수 있어요.",
    "",
    payload.markdown,
  ]
    .filter(Boolean)
    .join("\n");

  return { payload, intro };
}
