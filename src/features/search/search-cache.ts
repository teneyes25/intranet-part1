import "server-only";

import { unstable_cache } from "next/cache";

import type { SearchParams, SearchResultItem } from "@/features/search/queries";
import { unifiedSearch } from "@/features/search/queries";

const CACHE_TTL = 60;

function cacheKey(params: SearchParams & { userId: string }) {
  return [
    params.q,
    params.source ?? "all",
    params.category ?? "",
    params.period ?? "",
    params.author ?? "",
    params.hasAttachment ? "1" : "0",
    params.minViews ?? "",
    params.semantic ? "1" : "0",
    params.role,
    params.userId,
  ].join("|");
}

/** 동일 쿼리 60초 캐시 — 검색 부하 완화 */
export function cachedUnifiedSearch(params: SearchParams & { userId: string }) {
  const key = cacheKey(params);
  return unstable_cache(
    () => unifiedSearch(params),
    ["unified-search", key],
    { revalidate: CACHE_TTL, tags: ["search"] },
  )();
}
