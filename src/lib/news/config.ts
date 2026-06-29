import "server-only";

/** 게시판에 올릴 글 카테고리 (자동 수집 전용) */
export const AUTO_COLLECT_POST_CATEGORY = "자동수집";

/** node-cron 표현식 — 기본 매일 09:00 KST */
export const NEWS_CRON_SCHEDULE = process.env.NEWS_CRON_SCHEDULE ?? "0 9 * * *";

export const NEWS_CRON_TIMEZONE = process.env.NEWS_CRON_TIMEZONE ?? "Asia/Seoul";

/** DB에 키워드가 없을 때 시드하는 기본 업종 키워드 */
export const DEFAULT_INDUSTRY_KEYWORDS = [
  { category: "건설", keyword: "건설" },
  { category: "유통", keyword: "유통" },
  { category: "소비재", keyword: "소비재" },
  { category: "프랜차이즈", keyword: "프랜차이즈" },
] as const;

/**
 * NEWS_DEFAULT_KEYWORDS=건설:건설,유통:유통,소비재:소비재
 * 형식: category:keyword (쉼표 구분)
 */
export function parseDefaultKeywordsFromEnv(): { category: string; keyword: string }[] {
  const raw = process.env.NEWS_DEFAULT_KEYWORDS?.trim();
  if (!raw) return [...DEFAULT_INDUSTRY_KEYWORDS];

  return raw
    .split(",")
    .map((pair) => {
      const [category, keyword] = pair.split(":");
      const c = category?.trim() ?? "";
      const k = (keyword ?? category)?.trim() ?? "";
      return { category: c || k, keyword: k };
    })
    .filter((x) => x.keyword.length > 0);
}
