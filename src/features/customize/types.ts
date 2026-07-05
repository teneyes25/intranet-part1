export interface DashboardWidgetConfig {
  id: string;
  visible: boolean;
  order: number;
}

export interface DashboardLayoutConfig {
  showBanner: boolean;
  widgets: DashboardWidgetConfig[];
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutConfig = {
  showBanner: true,
  widgets: [
    { id: "stats", visible: true, order: 0 },
    { id: "pilotKpi", visible: true, order: 1 },
    { id: "activityChart", visible: true, order: 2 },
    { id: "recentPosts", visible: true, order: 3 },
    { id: "shortcuts", visible: true, order: 4 },
    { id: "aiSummary", visible: true, order: 5 },
    { id: "account", visible: true, order: 6 },
  ],
};

export interface ApprovalLineStep {
  approverId: string;
  stepOrder: number;
  label?: string;
}

export type CustomizeTab = "design" | "pageBuilder" | "ai" | "approval" | "integration";

export type PageBuilderLayout = "1" | "2" | "3";

export interface PageBuilderWidget {
  id: string;
  visible: boolean;
  order: number;
}

export type PageBuilderBlockType =
  | "heading"
  | "text"
  | "button"
  | "hero"
  | "widget"
  | "spacer";

export interface PageBuilderBlockProps {
  text?: string;
  subtitle?: string;
  label?: string;
  href?: string;
  color?: string;
  bgColor?: string;
  align?: "left" | "center" | "right";
  widgetId?: string;
  visible?: boolean;
  imageUrl?: string;
}

export interface PageBuilderBlock {
  id: string;
  type: PageBuilderBlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  props: PageBuilderBlockProps;
}

export interface PageBuilderGridSection {
  cols: number;
  rowHeight: number;
  blocks: PageBuilderBlock[];
}

export interface PageBuilderConfig {
  version?: 1 | 2;
  dashboard?: {
    columns: PageBuilderLayout;
    widgets: PageBuilderWidget[];
  };
  banner?: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
  };
  prHeader?: {
    title: string;
    subtitle: string;
  };
  /** Part 2 — 회사 홈페이지 디자인 테마 (pageBuilderConfig JSON 내, 스키마 변경 없음) */
  companyTheme?: {
    enabled: boolean;
    presetId: string;
    overrides?: {
      tagline?: string;
      subTagline?: string;
    };
  };
  grids?: {
    /** @deprecated Phase 4 — GrapesJS 마이그레이션 후 제거. parse 시 strip 됨 */
    dashboard?: PageBuilderGridSection;
    banner?: PageBuilderGridSection;
    pr?: PageBuilderGridSection;
  };
}

export const DEFAULT_PAGE_BUILDER_CONFIG: PageBuilderConfig = {
  dashboard: {
    columns: "2",
    widgets: DEFAULT_DASHBOARD_LAYOUT.widgets,
  },
  banner: {
    title: "인트라넷 포털",
    subtitle: "팀의 모든 소식과 업무를 한곳에서",
    buttonText: "시작하기",
    buttonLink: "/dashboard",
  },
  prHeader: {
    title: "홍보실",
    subtitle: "브랜드와 캠페인 소식",
  },
  companyTheme: {
    enabled: true,
    presetId: "french-maison",
  },
};

export const DEFAULT_COMPANY_THEME_CONFIG = {
  enabled: true,
  presetId: "french-maison",
} as const;
