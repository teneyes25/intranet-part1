export const GLOBAL_LAYOUT_SCOPE = "global";

export const CORE_PAGE_LAYOUT_SLUGS = ["dashboard", "banner"] as const;

export type CorePageLayoutSlug = (typeof CORE_PAGE_LAYOUT_SLUGS)[number];

/** @deprecated use boardLayoutSlug("pr") */
export const LEGACY_PR_SLUG = "pr";

export const MAX_LAYOUT_VERSIONS = 3;

/** 게시판 단위 post-detail slug (post-detail:products 등) */
export const POST_DETAIL_BOARD_KEYS = ["products", "pr", "anabada"] as const;

export type PageLayoutSlug =
  | CorePageLayoutSlug
  | `board:${string}`
  | `post-detail:${string}`
  | typeof LEGACY_PR_SLUG;

export const CORE_PAGE_LAYOUT_LABELS: Record<CorePageLayoutSlug, string> = {
  dashboard: "대시보드",
  banner: "메인 배너",
};

export function boardLayoutSlug(boardKey: string): `board:${string}` {
  return `board:${boardKey}`;
}

export function postDetailLayoutSlug(boardKey: string): `post-detail:${string}` {
  return `post-detail:${boardKey}`;
}

export function isBoardLayoutSlug(slug: string): slug is `board:${string}` {
  return slug.startsWith("board:");
}

export function isPostDetailLayoutSlug(slug: string): slug is `post-detail:${string}` {
  return slug.startsWith("post-detail:");
}

export function boardKeyFromLayoutSlug(slug: string): string | null {
  if (isBoardLayoutSlug(slug)) return slug.slice(6);
  if (isPostDetailLayoutSlug(slug)) return slug.slice(12);
  if (slug === LEGACY_PR_SLUG) return "pr";
  return null;
}

export function isValidPageLayoutSlug(slug: string): boolean {
  if ((CORE_PAGE_LAYOUT_SLUGS as readonly string[]).includes(slug)) return true;
  if (slug === LEGACY_PR_SLUG) return true;
  if (isBoardLayoutSlug(slug)) return slug.length > 6;
  if (isPostDetailLayoutSlug(slug)) return slug.length > 12;
  return false;
}

export function getPageLayoutLabel(
  slug: string,
  boardNames?: Record<string, string>,
  postTitles?: Record<string, string>,
): string {
  if (slug in CORE_PAGE_LAYOUT_LABELS) {
    return CORE_PAGE_LAYOUT_LABELS[slug as CorePageLayoutSlug];
  }
  if (slug === LEGACY_PR_SLUG) return "홍보실 상단 (레거시)";
  if (isBoardLayoutSlug(slug)) {
    const key = slug.slice(6);
    return `게시판: ${boardNames?.[key] ?? key}`;
  }
  if (isPostDetailLayoutSlug(slug)) {
    const id = slug.slice(12);
    if ((POST_DETAIL_BOARD_KEYS as readonly string[]).includes(id)) {
      return `상세(게시판): ${boardNames?.[id] ?? id}`;
    }
    return `상세(게시글): ${postTitles?.[id] ?? id.slice(0, 8)}…`;
  }
  return slug;
}

export interface PageBuilderAccessInfo {
  isHqAdmin: boolean;
  isReadOnly: boolean;
  lockedDealerId: string | null;
  defaultDealerScope: string;
  canEditGlobal: boolean;
}

export interface DealerScopeOption {
  id: string;
  code: string;
  name: string;
}

export interface PageThemeRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cssVars: Record<string, string>;
  canvasCss: string | null;
  isDefault: boolean;
  dealerId: string | null;
}

export interface PageTemplateRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  targetSlug: string;
  thumbnail: string | null;
  projectData: Record<string, unknown>;
  html: string | null;
  css: string | null;
  isBuiltIn: boolean;
  sortOrder: number;
  dealerId: string | null;
}

export interface PageLayoutVersionRecord {
  id: string;
  layoutId: string;
  version: number;
  note: string | null;
  createdById: string | null;
  createdAt: Date;
}

export interface PageLayoutRecord {
  id: string;
  slug: string;
  name: string;
  dealerId: string;
  projectData: Record<string, unknown>;
  html: string | null;
  css: string | null;
  isPublished: boolean;
  versionCount: number;
  themeId: string | null;
  updatedAt: Date;
}

export interface SavePageLayoutPayload {
  slug: string;
  projectData: Record<string, unknown>;
  html: string;
  css: string;
  themeId?: string | null;
  note?: string;
  dealerId?: string;
}

export interface PageBuilderEditorData {
  layouts: PageLayoutRecord[];
  themes: PageThemeRecord[];
  templates: PageTemplateRecord[];
  slugLabels: Record<string, string>;
  dealers: DealerScopeOption[];
  access: PageBuilderAccessInfo;
  postLayoutPosts: PostLayoutPostOption[];
}

export interface PostLayoutPostOption {
  id: string;
  title: string;
  boardKey: string;
  slug: string;
}

/** @deprecated use slugLabels from editor data */
export const PAGE_LAYOUT_SLUGS = ["dashboard", "banner", "pr"] as const;
/** @deprecated */
export const PAGE_LAYOUT_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  banner: "메인 배너",
  pr: "홍보실 상단",
};
