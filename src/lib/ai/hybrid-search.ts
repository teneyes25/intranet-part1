import "server-only";

import { prisma } from "@/lib/prisma";
import { fullTextSearchPosts } from "@/lib/search/fulltext";
import { similaritySearch, type SearchResult } from "./vector-store";

const RRF_K = 60;

async function searchPostsFulltext(query: string, limit: number) {
  const boards = await prisma.board.findMany({ select: { id: true, key: true } });
  const hits = await fullTextSearchPosts(
    query,
    boards.map((b) => b.id),
    limit,
  );
  return hits.map((h) => ({
    id: h.id,
    title: h.title,
    boardKey: h.boardKey,
    snippet: h.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400),
  }));
}

async function searchDocumentsKeyword(query: string, limit: number) {
  if (!query || query.length < 2) return [] as SearchResult[];
  const docs = await prisma.sharedDocument.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      category: true,
      approvalDocumentId: true,
      boardKey: true,
      postId: true,
    },
  });
  return docs.map((d, i) => ({
    id: `doc:${d.id}`,
    sourceType: "document",
    sourceId: d.id,
    title: `[문서함] ${d.title}`,
    url:
      d.url ||
      (d.postId && d.boardKey
        ? `/boards/${d.boardKey}/${d.postId}`
        : d.approvalDocumentId
          ? `/approval/${d.approvalDocumentId}`
          : "/documents"),
    content: (d.description ?? d.title).slice(0, 400),
    score: 1 - i * 0.03,
  }));
}

async function searchApprovalsKeyword(query: string, limit: number) {
  if (!query || query.length < 2) return [] as SearchResult[];
  const docs = await prisma.approvalDocument.findMany({
    where: {
      status: { not: "DRAFT" },
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true },
  });
  return docs.map((d, i) => ({
    id: `apr:${d.id}`,
    sourceType: "approval",
    sourceId: d.id,
    title: `[전자결재] ${d.title}`,
    url: `/approval/${d.id}`,
    content: d.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400),
    score: 1 - i * 0.03,
  }));
}

async function searchKnowledgeKeyword(query: string, limit: number) {
  if (!query || query.length < 2) return [] as SearchResult[];
  const rows = await prisma.aiKnowledgeMaterial.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true },
  });
  return rows.map((d, i) => ({
    id: `knowledge:${d.id}`,
    sourceType: "knowledge",
    sourceId: d.id,
    title: `[지정학습] ${d.title}`,
    url: `/admin/ai-models#knowledge-${d.id}`,
    content: d.content.replace(/\s+/g, " ").slice(0, 400),
    score: 1 - i * 0.03,
  }));
}

/** 임베딩 없이 FTS·키워드만으로 검색 (벡터/임베딩 장애 시 폴백) */
export async function keywordOnlySearch(
  query: string,
  k: number,
  sourceType?: string,
): Promise<SearchResult[]> {
  const [textHits, docHits, aprHits, knowledgeHits] = await Promise.all([
    sourceType && sourceType !== "post"
      ? Promise.resolve([])
      : searchPostsFulltext(query, k * 2).catch(
          () => [] as Awaited<ReturnType<typeof searchPostsFulltext>>,
        ),
    !sourceType || sourceType === "document"
      ? searchDocumentsKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
    !sourceType || sourceType === "approval"
      ? searchApprovalsKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
    !sourceType || sourceType === "knowledge"
      ? searchKnowledgeKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
  ]);

  const textAsResults: SearchResult[] = textHits.map((h, i) => ({
    id: `fts:${h.id}`,
    sourceType: "post",
    sourceId: h.id,
    title: h.title,
    url: `/boards/${h.boardKey}/${h.id}`,
    content: h.snippet,
    score: 1 - i * 0.03,
  }));

  const merged = new Map<string, SearchResult & { rrf: number }>();
  const addRanked = (items: SearchResult[], weight: number) => {
    items.forEach((item, rank) => {
      const key = `${item.sourceType}:${item.sourceId}`;
      const rrf = weight / (RRF_K + rank + 1);
      const prev = merged.get(key);
      if (prev) {
        prev.rrf += rrf;
        prev.score = Math.max(prev.score, item.score);
      } else {
        merged.set(key, { ...item, rrf });
      }
    });
  };
  addRanked(textAsResults, 0.8);
  addRanked(docHits, 0.7);
  addRanked(aprHits, 0.7);
  addRanked(knowledgeHits, 0.9);

  return [...merged.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, k)
    .map(({ rrf, ...rest }) => {
      void rrf;
      return rest;
    });
}

/** Reciprocal Rank Fusion — 벡터 + FTS/키워드 하이브리드 검색 */
export async function hybridSearch(
  query: string,
  embedding: number[],
  k: number,
  sourceType?: string,
): Promise<SearchResult[]> {
  const [vectorHits, textHits, docHits, aprHits, knowledgeHits] = await Promise.all([
    similaritySearch(embedding, k * 2, sourceType).catch((e) => {
      console.error("[hybrid-search] vector search failed:", e);
      return [] as SearchResult[];
    }),
    sourceType && sourceType !== "post"
      ? Promise.resolve([])
      : searchPostsFulltext(query, k * 2).catch(
          () => [] as Awaited<ReturnType<typeof searchPostsFulltext>>,
        ),
    !sourceType || sourceType === "document"
      ? searchDocumentsKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
    !sourceType || sourceType === "approval"
      ? searchApprovalsKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
    !sourceType || sourceType === "knowledge"
      ? searchKnowledgeKeyword(query, k).catch(() => [] as SearchResult[])
      : Promise.resolve([] as SearchResult[]),
  ]);

  const textAsResults: SearchResult[] = textHits.map((h, i) => ({
    id: `fts:${h.id}`,
    sourceType: "post",
    sourceId: h.id,
    title: h.title,
    url: `/boards/${h.boardKey}/${h.id}`,
    content: h.snippet,
    score: 1 - i * 0.03,
  }));

  const merged = new Map<string, SearchResult & { rrf: number }>();

  const addRanked = (items: SearchResult[], weight: number) => {
    items.forEach((item, rank) => {
      const key = `${item.sourceType}:${item.sourceId}`;
      const rrf = weight / (RRF_K + rank + 1);
      const prev = merged.get(key);
      if (prev) {
        prev.rrf += rrf;
        prev.score = Math.max(prev.score, item.score);
      } else {
        merged.set(key, { ...item, rrf });
      }
    });
  };

  addRanked(vectorHits, 1);
  addRanked(textAsResults, 0.8);
  addRanked(docHits, 0.7);
  addRanked(aprHits, 0.7);
  addRanked(knowledgeHits, 0.9);

  return [...merged.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, k)
    .map(({ rrf, ...rest }) => {
      void rrf;
      return rest;
    });
}
