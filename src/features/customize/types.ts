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
    { id: "activityChart", visible: true, order: 1 },
    { id: "recentPosts", visible: true, order: 2 },
    { id: "shortcuts", visible: true, order: 3 },
    { id: "aiSummary", visible: true, order: 4 },
    { id: "account", visible: true, order: 5 },
  ],
};

export interface ApprovalLineStep {
  approverId: string;
  stepOrder: number;
  label?: string;
}

export type CustomizeTab = "design" | "ai" | "approval" | "integration";
