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

export const ROOT_DOCUMENT_BOX_SLUG = "french-maison";
export const ROOT_DOCUMENT_BOX_NAME = "프렌치메종";

export type DocumentFolderSeed = {
  slug: string;
  name: string;
  description?: string;
  children?: DocumentFolderSeed[];
};

/** 프렌치메종 기본 폴더 트리 */
export const FRENCH_MAISON_TREE: DocumentFolderSeed = {
  slug: ROOT_DOCUMENT_BOX_SLUG,
  name: ROOT_DOCUMENT_BOX_NAME,
  description: "프렌치메종 문서함 최상위 폴더",
  children: [
    {
      slug: "general-affairs",
      name: "총무",
      description: "총무 부서 문서",
      children: [
        { slug: "ga-general", name: "일반관리" },
        { slug: "ga-attendance", name: "근태관리" },
        { slug: "ga-security", name: "보완" },
      ],
    },
    {
      slug: "accounting",
      name: "회계",
      description: "회계 부서 문서",
      children: [
        { slug: "ac-expense", name: "지출" },
        { slug: "ac-tax", name: "세무" },
      ],
    },
    {
      slug: "sales",
      name: "영업",
      description: "영업 부서 문서",
      children: [
        { slug: "sales-contract", name: "판매계약" },
        { slug: "sales-dealer", name: "대리점" },
        { slug: "sales-customer", name: "고객관리" },
        { slug: "sales-performance", name: "판매실적" },
      ],
    },
    {
      slug: "design",
      name: "디자인",
      description: "디자인 부서 문서",
      children: [
        { slug: "design-signature", name: "시그니쳐" },
        { slug: "design-essential", name: "에센셜" },
        { slug: "design-season", name: "시즌" },
        { slug: "design-etc", name: "기타" },
      ],
    },
    {
      slug: "logistics",
      name: "물류",
      description: "물류 부서 문서",
      children: [{ slug: "logistics-inventory", name: "재고관리" }],
    },
    {
      slug: "planning",
      name: "기획",
      description: "기획 부서 문서",
      children: [
        { slug: "planning-regulations", name: "사규" },
        { slug: "planning-goals", name: "경영 목표 및 실적" },
        { slug: "planning-audit", name: "감사" },
      ],
    },
    {
      slug: "hamnida",
      name: "합니다",
      description: "합니다 부서 문서",
      children: [],
    },
  ],
};

/** @deprecated 레거시 flat 시드 — FRENCH_MAISON_TREE 사용 */
export const DEFAULT_DOCUMENT_BOXES = [
  {
    key: "goals",
    name: "경영 목표 및 실적",
    slug: "goals",
    description: "경영 목표·실적·KPI 관련 문서",
    classification: "경영",
    classificationCode: "MG-01",
    retentionDays: 2555,
  },
] as const;
