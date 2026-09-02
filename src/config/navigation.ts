import {
  Home,
  Megaphone,
  MessageSquare,
  Newspaper,
  Sparkles,
  Package,
  Clock,
  FileCheck2,
  FolderOpen,
  Bot,
  Search,
  LayoutPanelLeft,
  Users,
  ShieldCheck,
  Activity,
  LineChart,
  HelpCircle,
  Settings,
  ServerCog,
  Store,
  Rocket,
  ShoppingCart,
  CalendarDays,
  BookMarked,
  PanelsTopLeft,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";
import { canAccessBoard, canSeeNavItem } from "@/lib/auth/access";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** 지정 시 해당 role 만 노출 */
  roles?: Role[];
  /** 최소 권한 등급 (HEADQUARTER = 본사 이상) */
  minRole?: Role;
  /** 제외할 role */
  excludeRoles?: Role[];
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** 그룹 자체를 특정 role 에만 노출 */
  roles?: Role[];
}

export interface NavBoard {
  key: string;
  name: string;
  sortOrder: number;
}

const BOARD_ICONS: Record<string, LucideIcon> = {
  notices: Megaphone,
  schedule: CalendarDays,
  regulations: BookMarked,
  general: MessageSquare,
  news: Newspaper,
  pr: Sparkles,
  products: Package,
};

/** 특정 게시판 메뉴에만 적용하는 접근 제한 */
const BOARD_NAV_RULES: Record<
  string,
  Pick<NavItem, "minRole" | "roles" | "excludeRoles">
> = {
  pr: { minRole: "HEADQUARTER" },
  products: { minRole: "HEADQUARTER" },
};

function boardToNavItem(board: NavBoard): NavItem {
  return {
    title: board.name,
    href: `/boards/${board.key}`,
    icon: BOARD_ICONS[board.key] ?? FileText,
    ...BOARD_NAV_RULES[board.key],
  };
}

const STATIC_GROUPS: NavGroup[] = [
  {
    label: "업무",
    items: [
      { title: "문서함", href: "/documents", icon: FolderOpen },
      { title: "연차관리", href: "/leave", icon: Clock },
      { title: "전자결재", href: "/approval", icon: FileCheck2 },
    ],
  },
  {
    label: "도구",
    items: [
      { title: "매종이", href: "/ai-agent", icon: Bot },
      { title: "사내 메신저", href: "/messenger", icon: MessageSquare },
      { title: "통합 검색", href: "/search", icon: Search },
      { title: "도움말", href: "/help", icon: HelpCircle },
      { title: "대리점 가이드", href: "/help/dealer", icon: Store, roles: ["DEALER"] },
      { title: "내 설정", href: "/settings", icon: Settings },
      {
        title: "페이지 미리보기",
        href: "/admin/customize/page-builder",
        icon: LayoutPanelLeft,
        minRole: "HEADQUARTER",
        excludeRoles: ["ADMIN", "DEALER"],
      },
      { title: "거래 모듈", href: "/commerce", icon: ShoppingCart, roles: ["DEALER", "HEADQUARTER", "ADMIN"] },
      { title: "페이지 편집", href: "/admin/customize/page-builder", icon: LayoutPanelLeft, roles: ["DEALER"] },
    ],
  },
  {
    label: "관리자",
    roles: ["ADMIN"],
    items: [
      { title: "사용자 관리", href: "/admin/users", icon: Users, roles: ["ADMIN"] },
      {
        title: "게시판 관리",
        href: "/admin/boards",
        icon: PanelsTopLeft,
        roles: ["ADMIN"],
      },
      { title: "대리점 관리", href: "/admin/dealers", icon: Store, roles: ["ADMIN"] },
      { title: "Rollout", href: "/admin/rollout", icon: Rocket, roles: ["ADMIN"] },
      { title: "뉴스 키워드", href: "/admin/news-keywords", icon: Newspaper, roles: ["ADMIN"] },
      {
        title: "매종이 LLM",
        href: "/admin/ai-models",
        icon: Bot,
        roles: ["ADMIN"],
      },
      {
        title: "상품자료실 카테고리",
        href: "/admin/product-categories",
        icon: Package,
        roles: ["ADMIN"],
      },
      { title: "업무 카테고리", href: "/admin/jobs", icon: Users, roles: ["ADMIN"] },
      { title: "문서함 카테고리", href: "/admin/document-categories", icon: FolderOpen, roles: ["ADMIN"] },
      { title: "활동 로그", href: "/admin/activity", icon: Activity, roles: ["ADMIN"] },
      {
        title: "메신저 로그",
        href: "/admin/messenger-logs",
        icon: MessageSquare,
        roles: ["ADMIN"],
      },
      { title: "포털 커스터마이징", href: "/admin/customize", icon: Settings, roles: ["ADMIN"] },
      { title: "Visual Page Builder", href: "/admin/customize/page-builder", icon: LayoutPanelLeft, roles: ["ADMIN"] },
      { title: "시스템 상태", href: "/admin/system", icon: ServerCog, roles: ["ADMIN"] },
      { title: "실시간 모니터링", href: "/admin/monitoring", icon: LineChart, roles: ["ADMIN"] },
      { title: "권한/보안", href: "/admin/security", icon: ShieldCheck, roles: ["ADMIN"] },
    ],
  },
];

/** DB 게시판 목록을 반영한 네비게이션 (사이드바용) */
export function buildNavGroups(boards: NavBoard[] = []): NavGroup[] {
  const sorted = [...boards].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ko"),
  );

  return [
    {
      label: "워크스페이스",
      items: [
        { title: "홈", href: "/dashboard", icon: Home },
        { title: "대리점 포털", href: "/dealer-portal", icon: Store, roles: ["DEALER", "ADMIN"] },
        ...sorted.map(boardToNavItem),
      ],
    },
    ...STATIC_GROUPS,
  ];
}

/** @deprecated 정적 기본값 — buildNavGroups 사용 권장 */
export const NAV_GROUPS: NavGroup[] = buildNavGroups([
  { key: "notices", name: "공지사항", sortOrder: 10 },
  { key: "schedule", name: "일정", sortOrder: 20 },
  { key: "regulations", name: "사규", sortOrder: 30 },
  { key: "general", name: "게시판", sortOrder: 40 },
  { key: "news", name: "뉴스", sortOrder: 50 },
  { key: "pr", name: "홍보실", sortOrder: 60 },
  { key: "products", name: "상품자료실", sortOrder: 70 },
]);

export function getVisibleNavGroups(
  role: Role | undefined,
  boards: NavBoard[] = [],
): NavGroup[] {
  const groups = boards.length > 0 ? buildNavGroups(boards) : NAV_GROUPS;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!canSeeNavItem(role, item)) return false;
        // 게시판 링크는 역할별 게시판 접근 권한도 확인
        const boardMatch = item.href.match(/^\/boards\/([^/]+)$/);
        if (boardMatch && role && !canAccessBoard(role, boardMatch[1]!)) {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => {
      if (group.roles?.length && role && !group.roles.includes(role)) return false;
      return group.items.length > 0;
    });
}
