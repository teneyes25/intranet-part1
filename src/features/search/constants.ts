export const SEARCH_SOURCES = [
  { key: "all", label: "전체" },
  { key: "notices", label: "공지사항" },
  { key: "general", label: "게시판" },
  { key: "news", label: "뉴스" },
  { key: "pr", label: "홍보실" },
  { key: "products", label: "상품자료실" },
  { key: "anabada", label: "아나바다장터" },
  { key: "documents", label: "문서함" },
  { key: "approval", label: "전자결재" },
] as const;

export type SearchSourceKey = (typeof SEARCH_SOURCES)[number]["key"];

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  SEARCH_SOURCES.map((s) => [s.key, s.label]),
);
