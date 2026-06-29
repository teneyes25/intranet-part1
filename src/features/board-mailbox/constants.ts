export const SYSTEM_FOLDERS = [
  { key: "inbox", name: "받은편지함", icon: "inbox" as const },
  { key: "important", name: "중요", icon: "star" as const },
  { key: "draft", name: "임시보관", icon: "file" as const },
  { key: "trash", name: "휴지통", icon: "trash" as const },
] as const;

export type SystemFolderKey = (typeof SYSTEM_FOLDERS)[number]["key"];

export const MAILBOX_PAGE_SIZE = 20;

export const LABEL_COLORS = [
  "#3B82F6",
  "#1E40AF",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#64748B",
];
