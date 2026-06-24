export type FeedbackCategory = "usability" | "bug" | "feature" | "other";

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "usability", label: "사용성" },
  { value: "bug", label: "버그/오류" },
  { value: "feature", label: "기능 제안" },
  { value: "other", label: "기타" },
];

export interface PilotBannerConfig {
  show: boolean;
  title: string;
  message: string;
  feedbackEnabled: boolean;
}

export type PilotAdminTab = "settings" | "groups" | "monitoring" | "checklist";
