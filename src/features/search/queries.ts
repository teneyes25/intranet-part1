import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/ai/embeddings";
import { similaritySearch } from "@/lib/ai/vector-store";
import type { Role } from "@/lib/auth/roles";
import { canAccessBoard } from "@/lib/auth/access";
import { fullTextSearchPosts } from "@/lib/search/fulltext";
import type { SearchSourceKey } from "./constants";

export interface SearchResultItem {
  id: string;
  type: "post" | "document" | "approval" | "semantic";
  title: string;
  snippet: string;
  href: string;
  source: string;
  category?: string | null;
  date: Date;
  score?: number;
}

export interface SearchParams {
  q: string;
  source?: SearchSourceKey;
  category?: string;
  from?: Date;
  to?: Date;
  semantic?: boolean;
  role: Role;
  limit?: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchPosts(
  params: SearchParams,
  boardKeys?: string[],
): Promise<SearchResultItem[]> {
  const boards = await prisma.board.findMany({
    where: boardKeys?.length ? { key: { in: boardKeys } } : undefined,
    select: { id: true, key: true, name: true },
  });

  const accessible = boards.filter((b) => canAccessBoard(params.role, b.key));
  if (accessible.length === 0) return [];

  // Full-Text Search 우선 (키워드 있을 때)
  if (params.q && params.q.length >= 2) {
    const fts = await fullTextSearchPosts(
      params.q,
      accessible.map((b) => b.id),
      params.limit ?? 30,
    );
    if (fts.length > 0) {
      return fts.map((p) => ({
        id: p.id,
        type: "post" as const,
        title: p.title,
        snippet: stripHtml(p.content).slice(0, 160),
        href: `/boards/${p.boardKey}/${p.id}`,
        source: p.boardName,
        category: p.category,
        date: p.createdAt,
        score: p.rank,
      }));
    }
  }

  const where: Prisma.PostWhereInput = {
    boardId: { in: accessible.map((b) => b.id) },
  };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { content: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = params.category;
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: params.limit ?? 30,
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      createdAt: true,
      board: { select: { key: true, name: true } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    type: "post" as const,
    title: p.title,
    snippet: stripHtml(p.content).slice(0, 160),
    href: `/boards/${p.board.key}/${p.id}`,
    source: p.board.name,
    category: p.category,
    date: p.createdAt,
  }));
}

async function searchDocuments(params: SearchParams): Promise<SearchResultItem[]> {
  const where: Prisma.SharedDocumentWhereInput = {};
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = params.category;

  const docs = await prisma.sharedDocument.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: params.limit ?? 20,
  });

  return docs.map((d) => ({
    id: d.id,
    type: "document" as const,
    title: d.title,
    snippet: (d.description ?? "").slice(0, 160),
    href: d.url ?? (d.boardKey && d.postId ? `/boards/${d.boardKey}/${d.postId}` : "/documents"),
    source: "문서함",
    category: d.category,
    date: d.updatedAt,
  }));
}

async function searchApprovals(params: SearchParams, userId: string): Promise<SearchResultItem[]> {
  const where: Prisma.ApprovalDocumentWhereInput = {
    OR: [{ drafterId: userId }, { steps: { some: { approverId: userId } } }],
  };

  if (params.q) {
    where.AND = [
      {
        OR: [
          { title: { contains: params.q, mode: "insensitive" } },
          { content: { contains: params.q, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }

  const docs = await prisma.approvalDocument.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: params.limit ?? 15,
    select: { id: true, title: true, content: true, status: true, updatedAt: true },
  });

  return docs.map((d) => ({
    id: d.id,
    type: "approval" as const,
    title: d.title,
    snippet: stripHtml(d.content).slice(0, 160),
    href: `/approval/${d.id}`,
    source: "전자결재",
    category: d.status,
    date: d.updatedAt,
  }));
}

async function searchSemantic(params: SearchParams): Promise<SearchResultItem[]> {
  if (!params.q) return [];
  try {
    const vec = await embedText(params.q);
    const results = await similaritySearch(vec, 8);
    return results.map((r) => ({
      id: r.id,
      type: "semantic" as const,
      title: r.title ?? "내부 자료",
      snippet: r.content.replace(/\s+/g, " ").slice(0, 160),
      href: r.url ?? "#",
      source: "AI 의미 검색",
      date: new Date(),
      score: r.score,
    }));
  } catch (e) {
    console.error("[search] semantic failed:", e);
    return [];
  }
}

export async function unifiedSearch(
  params: SearchParams & { userId: string },
): Promise<SearchResultItem[]> {
  const limit = params.limit ?? 30;
  const source = params.source ?? "all";

  const tasks: Promise<SearchResultItem[]>[] = [];

  if (params.semantic && params.q) {
    tasks.push(searchSemantic(params));
  }

  if (source === "all" || source === "documents") {
    tasks.push(searchDocuments({ ...params, limit: 15 }));
  }

  if (source === "all" || source === "approval") {
    tasks.push(searchApprovals({ ...params, limit: 10 }, params.userId));
  }

  const boardMap: Record<string, string[] | undefined> = {
    notices: ["notices"],
    regulations: ["regulations"],
    general: ["general"],
    news: ["news"],
    pr: ["pr"],
    products: ["products"],
    schedule: ["schedule"],
  };

  if (source === "all") {
    tasks.push(searchPosts({ ...params, limit }));
  } else if (boardMap[source]) {
    tasks.push(searchPosts({ ...params, limit }, boardMap[source]));
  }

  const batches = await Promise.all(tasks);
  const merged = batches.flat();

  // 중복 제거 (href 기준)
  const seen = new Set<string>();
  const unique = merged.filter((item) => {
    const key = `${item.type}:${item.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 키워드 검색이면 최신순, 의미검색 포함이면 score 우선
  if (params.semantic) {
    return unique.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  return unique.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}
