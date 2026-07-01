import "server-only";

import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { ingestPost } from "@/lib/ai/ingest";
import { getActiveKeywords } from "@/features/news/keyword-service";
import { selectKeywordsForToday } from "@/lib/news/select-keywords";
import {
  AUTO_COLLECT_POST_CATEGORY,
  parseDefaultKeywordsFromEnv,
} from "@/lib/news/config";
import { fetchNews, type NewsItem } from "./sources";
import { summarizeNews } from "./summarize";

export const NEWS_BOARD_KEY = "news";
const NEWS_BOT_EMAIL = "newsbot@intranet.local";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ensureNewsBoard(keywordCategories: string[]) {
  const categories = [
    AUTO_COLLECT_POST_CATEGORY,
    ...new Set(keywordCategories),
  ];
  return prisma.board.upsert({
    where: { key: NEWS_BOARD_KEY },
    update: { categories: [...new Set(categories)] },
    create: {
      key: NEWS_BOARD_KEY,
      name: "업계 뉴스",
      description: "매일 자동 수집되는 업계 뉴스 (AI 요약·출처 포함)",
      categories: [...new Set(categories)],
      writeRoles: ["ADMIN"],
      allowComments: true,
    },
  });
}

async function ensureNewsBotUser() {
  return prisma.user.upsert({
    where: { email: NEWS_BOT_EMAIL },
    update: {},
    create: {
      email: NEWS_BOT_EMAIL,
      name: "AI 뉴스봇",
      role: "HEADQUARTER",
      approvalStatus: "APPROVED",
      passwordHash: "disabled-system-account",
    },
  });
}

function buildContent(
  summaryLines: string[],
  item: NewsItem,
  keywordLabel: string,
): string {
  const lines = summaryLines.map((l) => escapeHtml(l)).join("<br/>");
  const src = item.source ? ` (${escapeHtml(item.source)})` : "";
  const html = `
    <p><strong>[${escapeHtml(keywordLabel)}]</strong></p>
    <p>${lines}</p>
    <p>🔗 <a href="${escapeHtml(item.link)}">원문 보기${src}</a></p>
    <p><em>본 글은 등록 키워드 기반 자동 수집·AI 요약입니다. (카테고리: ${AUTO_COLLECT_POST_CATEGORY})</em></p>
  `;
  return sanitizeRichText(html);
}

export interface CollectResult {
  category: string;
  keyword?: string;
  status: "published" | "skipped" | "no-result" | "error";
  title?: string;
  reason?: string;
}

export async function collectAndPublish(): Promise<CollectResult[]> {
  let activeKeywords = await getActiveKeywords();

  if (activeKeywords.length === 0) {
    for (const kw of parseDefaultKeywordsFromEnv()) {
      await prisma.newsKeyword.upsert({
        where: { keyword: kw.keyword },
        update: { category: kw.category, isActive: true },
        create: kw,
      });
    }
    activeKeywords = await getActiveKeywords();
  }

  const selected = await selectKeywordsForToday(activeKeywords);
  const categories = [...new Set(activeKeywords.map((k) => k.category))];
  const board = await ensureNewsBoard(categories);
  const bot = await ensureNewsBotUser();
  const results: CollectResult[] = [];

  for (const kw of selected) {
    try {
      const candidates = await fetchNews(kw.keyword);
      if (candidates.length === 0) {
        results.push({ category: kw.category, keyword: kw.keyword, status: "no-result" });
        continue;
      }

      let chosen: NewsItem | null = null;
      for (const c of candidates) {
        if (!c.title || !c.link) continue;
        const dup = await prisma.post.findFirst({
          where: { boardId: board.id, title: c.title },
          select: { id: true },
        });
        if (!dup) {
          chosen = c;
          break;
        }
      }

      if (!chosen) {
        results.push({
          category: kw.category,
          keyword: kw.keyword,
          status: "skipped",
          reason: "중복",
        });
        continue;
      }

      const summary = await summarizeNews(chosen);
      const post = await prisma.post.create({
        data: {
          boardId: board.id,
          authorId: bot.id,
          title: chosen.title,
          content: buildContent(summary, chosen, kw.keyword),
          category: AUTO_COLLECT_POST_CATEGORY,
        },
        select: { id: true },
      });

      await ingestPost(post.id).catch((e) =>
        console.error("[news] 색인 실패:", post.id, e),
      );

      results.push({
        category: kw.category,
        keyword: kw.keyword,
        status: "published",
        title: chosen.title,
      });
    } catch (e) {
      console.error(`[news] '${kw.keyword}' 수집 실패:`, e);
      results.push({
        category: kw.category,
        keyword: kw.keyword,
        status: "error",
        reason: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return results;
}
