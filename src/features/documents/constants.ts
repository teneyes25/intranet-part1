/** 문서함 하위 게시판에서 사용하는 고정 카테고리 */
export const DOCUMENT_POST_CATEGORIES = ["기안문", "자료"] as const;

export type DocumentPostCategory = (typeof DOCUMENT_POST_CATEGORIES)[number];

export const DOCUMENT_POST_CATEGORY_DRAFT: DocumentPostCategory = "기안문";
export const DOCUMENT_POST_CATEGORY_MATERIAL: DocumentPostCategory = "자료";

/** 워크스페이스에 남는 게시판 (문서함 밖) */
export const WORKSPACE_BOARD_KEYS = [
  "notices",
  "schedule",
  "general",
  "news",
] as const;

/** 문서함 기본 하위 게시판 시드 */
export const DEFAULT_DOCUMENT_BOXES = [
  {
    key: "goals",
    name: "경영 목표 및 실적",
    slug: "goals",
    description: "경영 목표·실적·KPI 관련 문서",
    classification: "경영",
    classificationCode: "MG-01",
    retentionDays: 2555, // 7년
  },
  {
    key: "regulations",
    name: "사규",
    slug: "regulations",
    description: "사내 규정·지침·세칙",
    classification: "인사·총무",
    classificationCode: "HR-01",
    retentionDays: null as number | null,
  },
  {
    key: "market-trends",
    name: "시장 트렌드",
    slug: "market-trends",
    description: "시장·경쟁·트렌드 분석 자료",
    classification: "기획",
    classificationCode: "PL-01",
    retentionDays: 1095, // 3년
  },
  {
    key: "pr",
    name: "홍보실",
    slug: "pr",
    description: "브랜드·홍보·보도 자료",
    classification: "홍보",
    classificationCode: "PR-01",
    retentionDays: 1825, // 5년
  },
  {
    key: "products",
    name: "상품자료실",
    slug: "products",
    description: "상품 카탈로그 및 판매 자료",
    classification: "상품",
    classificationCode: "PD-01",
    retentionDays: 1825,
  },
] as const;
