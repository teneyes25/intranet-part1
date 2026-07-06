import type { Role } from "@/lib/auth/roles";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayoutConfig,
} from "@/features/customize/types";

const ROLE_WIDGET_VISIBILITY: Record<Role, Record<string, boolean>> = {
  ADMIN: {
    stats: true,
    pilotKpi: true,
    activityFeed: true,
    activityChart: true,
    recentPosts: true,
    shortcuts: true,
    aiSummary: true,
    account: true,
  },
  HEADQUARTER: {
    stats: true,
    pilotKpi: false,
    activityFeed: true,
    activityChart: true,
    recentPosts: true,
    shortcuts: true,
    aiSummary: true,
    account: false,
  },
  DEALER: {
    stats: true,
    pilotKpi: false,
    activityFeed: true,
    activityChart: false,
    recentPosts: true,
    shortcuts: true,
    aiSummary: true,
    account: false,
  },
};

/** SiteSettings 레이아웃과 역할별 기본값을 병합 */
export function mergeDashboardLayoutForRole(
  role: Role,
  siteLayout: DashboardLayoutConfig,
): DashboardLayoutConfig {
  const roleDefaults = ROLE_WIDGET_VISIBILITY[role];
  return {
    showBanner: siteLayout.showBanner,
    widgets: DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => {
      const siteWidget = siteLayout.widgets.find((sw) => sw.id === w.id);
      const visible =
        siteWidget?.visible ??
        roleDefaults[w.id] ??
        w.visible;
      return {
        id: w.id,
        visible,
        order: siteWidget?.order ?? w.order,
      };
    }),
  };
}
