import "server-only";

import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { ingestPost } from "@/lib/ai/ingest";
import {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL,
  OPENAI_BASE_URL,
} from "@/lib/ai/config";
import { MARKET_REPORT_SYSTEM_PROMPT, AI_AGENT_NAME, AI_AGENT_ORG } from "@/lib/ai/persona";
import { getActiveKeywords } from "@/features/news/keyword-service";
import { notifyUsers } from "@/features/notifications/service";
import { writeAudit } from "@/lib/audit/service";
import { NEWS_BOARD_KEY } from "@/lib/news/collect";

const REPORT_CATEGORY = "시장조사";
const BOT_EMAIL = "maejongi@intranet.local";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kstYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { year, month, label: `${year}년 ${Number(month)}월` };
}

async function ensureMaejongBot() {
  return prisma.user.upsert({
    where: { email: BOT_EMAIL },
    update: { name: AI_AGENT_NAME },
    create: {
      email: BOT_EMAIL,
      name: AI_AGENT_NAME,
      role: Role.HEADQUARTER,
      approvalStatus: "APPROVED",
      passwordHash: "disabled-system-account",
    },
  });
}

async function ensureNewsBoardWithMarketCategory() {
  const board = await prisma.board.findUnique({ where: { key: NEWS_BOARD_KEY } });
  if (!board) {
    return prisma.board.create({
      data: {
        key: NEWS_BOARD_KEY,
        name: "뉴스",
        description: "뉴스·시장조사",
        categories: [REPORT_CATEGORY, "자동수집"],
        writeRoles: [Role.ADMIN],
        allowComments: true,
        sortOrder: 50,
      },
    });
  }
  if (!board.categories.includes(REPORT_CATEGORY)) {
    return prisma.board.update({
      where: { id: board.id },
      data: { categories: [...board.categories, REPORT_CATEGORY] },
    });
  }
  return board;
}

function fallbackReportHtml(label: string, newsLines: string[], keywords: string[]) {
  const news =
    newsLines.length > 0
      ? newsLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")
      : "<li>최근 수집된 뉴스가 없습니다.</li>";
  return sanitizeRichText(
    `<h2>1. 개요</h2><p>${escapeHtml(label)} ${escapeHtml(AI_AGENT_ORG)} 시장조사 보고서입니다. (${escapeHtml(AI_AGENT_NAME)} 작성)</p>` +
      `<h2>2. 관심 키워드</h2><p>${escapeHtml(keywords.join(", ") || "등록된 키워드 없음")}</p>` +
      `<h2>3. 최근 뉴스 동향</h2><ul>${news}</ul>` +
      `<h2>4. 시사점</h2><p>내부 뉴스·자료를 바탕으로 추가 검증이 필요합니다. 생성형 AI 키가 없어 요약 골격을 제공합니다.</p>` +
      `<h2>5. 제안 액션</h2><ul><li>핵심 키워드 뉴스 모니터링 지속</li><li>관련 기안·문서함 자료와 교차 확인</li></ul>`,
  );
}

async function generateReportHtml(params: {
  label: string;
  keywords: string[];
  newsDigest: string;
}): Promise<{ html: string; mode: "generative" | "fallback" }> {
  if (!OPENAI_API_KEY) {
    return {
      html: fallbackReportHtml(
        params.label,
        params.newsDigest.split("\n").filter(Boolean).slice(0, 8),
        params.keywords,
      ),
      mode: "fallback",
    };
  }

  try {
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
          { role: "system", content: MARKET_REPORT_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `보고서 기간: ${params.label}`,
              `관심 키워드: ${params.keywords.join(", ") || "(없음)"}`,
              `최근 내부 수집 뉴스 요약:\n${params.newsDigest || "(없음)"}`,
              "",
              "HTML로만 작성하세요. 구성: h2로 1.개요 2.시장 동향 3.경쟁·업계 이슈 4.프렌치메종 시사점 5.이번 달 제안 액션.",
              "본문만 출력하고 코드펜스는 쓰지 마세요.",
            ].join("\n"),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    let content = data.choices?.[0]?.message?.content?.trim() ?? "";
    content = content.replace(/^```html?\s*/i, "").replace(/```$/i, "").trim();
    if (!content) throw new Error("empty");
    return { html: sanitizeRichText(content), mode: "generative" };
  } catch (e) {
    console.error("[market-report] OpenAI 실패:", e);
    return {
      html: fallbackReportHtml(
        params.label,
        params.newsDigest.split("\n").filter(Boolean).slice(0, 8),
        params.keywords,
      ),
      mode: "fallback",
    };
  }
}

export interface MarketReportResult {
  skipped?: boolean;
  reason?: string;
  postId?: string;
  title?: string;
  mode?: "generative" | "fallback";
}

/** 월간 시장조사 보고서 작성·게시 (뉴스 게시판 · 카테고리 시장조사) */
export async function generateMonthlyMarketReport(
  source: "cron" | "manual" | "api" = "cron",
): Promise<MarketReportResult> {
  const { year, month, label } = kstYearMonth();
  const title = `[시장조사] ${label} 시장동향 보고서`;

  const board = await ensureNewsBoardWithMarketCategory();
  const existing = await prisma.post.findFirst({
    where: {
      boardId: board.id,
      category: REPORT_CATEGORY,
      title,
    },
    select: { id: true },
  });
  if (existing && source === "cron") {
    return { skipped: true, reason: "already_exists", postId: existing.id };
  }

  const since = new Date();
  since.setDate(since.getDate() - 35);

  const [keywords, newsPosts] = await Promise.all([
    getActiveKeywords().catch(() => [] as { keyword: string }[]),
    prisma.post.findMany({
      where: {
        boardId: board.id,
        createdAt: { gte: since },
        NOT: { category: REPORT_CATEGORY },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { title: true, content: true, category: true },
    }),
  ]);

  const keywordLabels = keywords.map((k) => k.keyword);
  const newsDigest = newsPosts
    .map((p) => {
      const plain = p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return `- [${p.category ?? "뉴스"}] ${p.title}: ${plain.slice(0, 180)}`;
    })
    .join("\n");

  const { html, mode } = await generateReportHtml({
    label,
    keywords: keywordLabels,
    newsDigest,
  });

  const bot = await ensureMaejongBot();

  let postId: string;
  if (existing) {
    await prisma.post.update({
      where: { id: existing.id },
      data: { content: html, title },
    });
    postId = existing.id;
  } else {
    const created = await prisma.post.create({
      data: {
        boardId: board.id,
        authorId: bot.id,
        title,
        content: html,
        category: REPORT_CATEGORY,
      },
      select: { id: true },
    });
    postId = created.id;
  }

  void ingestPost(postId).catch((e) =>
    console.error("[market-report] ingest failed:", e),
  );

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true },
  });
  if (admins.length > 0) {
    await notifyUsers(
      admins.map((a) => a.id),
      {
        type: "SYSTEM",
        title: `[${AI_AGENT_NAME}] ${label} 시장조사 보고서`,
        body: `${title}이(가) 게시되었습니다.`,
        link: `/boards/news/${postId}`,
      },
    );
  }

  void writeAudit({
    action: "AI_NEWS_COLLECT",
    resource: "market-report",
    detail: `source=${source} year=${year} month=${month} post=${postId} mode=${mode}`,
    success: true,
  });

  return { postId, title, mode };
}
