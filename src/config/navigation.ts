import {
  Home,
  Megaphone,
  CalendarDays,
  Newspaper,
  Sparkles,
  Package,
  MapPin,
  FolderOpen,
  Clock,
  FileCheck2,
  Bot,
  Search,
  LayoutPanelLeft,
  Users,
  ShieldCheck,
  Activity,
  LineChart,
  HelpCircle,
  Settings,
  FlaskConical,
  ServerCog,
  Store,
  Rocket,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";
import { canSeeNavItem } from "@/lib/auth/access";
import type { NavModuleKey } from "@/config/nav-modules";
import { isNavModuleVisible } from "@/config/nav-modules";

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
  /** NAV_MODULE_VISIBLE 로 메뉴 숨김 제어 (라우트는 유지) */
  moduleKey?: NavModuleKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** 그룹 자체를 특정 role 에만 노출 */
  roles?: Role[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "워크스페이스",
    items: [
      { title: "홈", href: "/dashboard", icon: Home },
      { title: "대리점 포털", href: "/dealer-portal", icon: Store, roles: ["DEALER", "ADMIN"] },
    ],
  },
  {
    label: "게시판",
    items: [
      { title: "공지사항", href: "/boards/notices", icon: Megaphone },
      { title: "일정 게시판", href: "/boards/schedule", icon: CalendarDays },
      { title: "업계 뉴스", href: "/boards/news", icon: Newspaper },
      {
        title: "홍보실(방송 자료실)",
        href: "/boards/pr",
        icon: Sparkles,
        minRole: "HEADQUARTER",
      },
      { title: "상품 자료실", href: "/boards/products", icon: Package },
      { title: "매장 찾기", href: "/stores", icon: MapPin },
    ],
  },
  {
    label: "업무",
    items: [
      { title: "문서함", href: "/documents", icon: FolderOpen, moduleKey: "documents" },
      {
        title: "근태관리",
        href: "/attendance",
        icon: Clock,
        minRole: "HEADQUARTER",
        moduleKey: "attendance",
      },
      { title: "전자결재", href: "/approval", icon: FileCheck2, moduleKey: "approval" },
    ],
  },
  {
    label: "도구",
    items: [
      { title: "AI 에이전트", href: "/ai-agent", icon: Bot },
      { title: "통합 검색", href: "/search", icon: Search, moduleKey: "search" },
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
      {
        title: "거래 모듈",
        href: "/commerce",
        icon: ShoppingCart,
        roles: ["DEALER", "HEADQUARTER", "ADMIN"],
      },
      {
        title: "페이지 편집",
        href: "/admin/customize/page-builder",
        icon: LayoutPanelLeft,
        roles: ["DEALER"],
      },
    ],
  },
  {
    label: "관리자",
    roles: ["ADMIN"],
    items: [
      { title: "사용자 관리", href: "/admin/users", icon: Users, roles: ["ADMIN"] },
      { title: "대리점 관리", href: "/admin/dealers", icon: Store, roles: ["ADMIN"] },
      { title: "Rollout", href: "/admin/rollout", icon: Rocket, roles: ["ADMIN"] },
      { title: "뉴스 키워드", href: "/admin/news-keywords", icon: Newspaper, roles: ["ADMIN"] },
      {
        title: "문서함 카테고리",
        href: "/admin/document-categories",
        icon: FolderOpen,
        roles: ["ADMIN"],
        moduleKey: "documents",
      },
      { title: "활동 로그", href: "/admin/activity", icon: Activity, roles: ["ADMIN"] },
      { title: "포털 커스터마이징", href: "/admin/customize", icon: Settings, roles: ["ADMIN"] },
      {
        title: "Visual Page Builder",
        href: "/admin/customize/page-builder",
        icon: LayoutPanelLeft,
        roles: ["ADMIN"],
      },
      { title: "시스템 상태", href: "/admin/system", icon: ServerCog, roles: ["ADMIN"] },
      { title: "실시간 모니터링", href: "/admin/monitoring", icon: LineChart, roles: ["ADMIN"] },
      { title: "Pilot 관리", href: "/admin/pilot", icon: FlaskConical, roles: ["ADMIN"] },
      { title: "권한/보안", href: "/admin/security", icon: ShieldCheck, roles: ["ADMIN"] },
    ],
  },
];

export function getVisibleNavGroups(role: Role | undefined): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => isNavModuleVisible(item.moduleKey) && canSeeNavItem(role, item),
    ),
  })).filter((group) => {
    if (group.roles?.length && role && !group.roles.includes(role)) return false;
    return group.items.length > 0;
  });
}
