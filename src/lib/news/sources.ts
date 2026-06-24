import "server-only";

import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  link: string;
  description: string;
  source?: string;
  pubDate?: string;
}

/** HTML 태그/엔티티 제거 후 공백 정리 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const NAVER_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

/** 네이버 뉴스 검색 API (키가 있을 때만 동작). sort=sim → 정확도(중요도) 순 */
async function fetchFromNaver(query: string, display = 10): Promise<NewsItem[]> {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(
    query,
  )}&display=${display}&sort=sim`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_ID,
      "X-Naver-Client-Secret": NAVER_SECRET,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`네이버 뉴스 API 오류: ${res.status}`);
  }
  const data = (await res.json()) as {
    items?: {
      title: string;
      originallink?: string;
      link: string;
      description: string;
      pubDate?: string;
    }[];
  };
  return (data.items ?? []).map((it) => ({
    title: stripHtml(it.title),
    link: it.originallink || it.link,
    description: stripHtml(it.description),
    source: "네이버뉴스",
    pubDate: it.pubDate,
  }));
}

/** 구글 뉴스 RSS (키 불필요 폴백). 한국어/최근 1일 */
async function fetchFromGoogleNews(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${query} when:2d`,
  )}&hl=ko&gl=KR&ceid=KR:ko`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (intranet-news-bot)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`구글 뉴스 RSS 오류: ${res.status}`);
  }
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
  };

  const rawItems = parsed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return (items as Record<string, unknown>[]).map((it) => {
    const rawTitle = String(it.title ?? "");
    // 구글 뉴스 제목은 "헤드라인 - 언론사" 형태
    const source =
      typeof it.source === "object" && it.source
        ? String((it.source as Record<string, unknown>)["#text"] ?? "")
        : undefined;
    const title = source
      ? rawTitle.replace(new RegExp(`\\s*-\\s*${source}\\s*$`), "").trim()
      : rawTitle;
    return {
      title: stripHtml(title),
      link: String(it.link ?? ""),
      description: stripHtml(String(it.description ?? "")),
      source: source || "Google News",
      pubDate: it.pubDate ? String(it.pubDate) : undefined,
    } satisfies NewsItem;
  });
}

/**
 * 카테고리 키워드로 뉴스 후보 목록을 가져온다.
 * 네이버 키가 있으면 네이버, 없으면 구글 뉴스로 폴백.
 */
export async function fetchNews(query: string): Promise<NewsItem[]> {
  if (NAVER_ID && NAVER_SECRET) {
    try {
      const naver = await fetchFromNaver(query);
      if (naver.length > 0) return naver;
    } catch (e) {
      console.error("[news] 네이버 실패, 구글 뉴스로 폴백:", e);
    }
  }
  return fetchFromGoogleNews(query);
}
