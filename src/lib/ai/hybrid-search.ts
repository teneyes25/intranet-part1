import "server-only";

import { prisma } from "@/lib/prisma";
import { fullTextSearchPosts } from "@/lib/search/fulltext";
import { similaritySearch, type SearchResult, type SearchScope } from "./vector-store";

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

/** Reciprocal Rank Fusion — 벡터 + FTS 하이브리드 검색 후 rerank */
export async function hybridSearch(
  query: string,
  embedding: number[],
  k: number,
  sourceType?: string,
  scope?: SearchScope,
): Promise<SearchResult[]> {
  const [vectorHits, textHits] = await Promise.all([
    similaritySearch(embedding, k * 2, sourceType, scope),
    searchPostsFulltext(query, k * 2).catch(() => [] as Awaited<ReturnType<typeof searchPostsFulltext>>),
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

  return [...merged.values()]
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, k)
    .map(({ rrf, ...rest }) => {
      void rrf;
      return rest;
    });
}
