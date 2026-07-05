/** 게시판 검색 기간 프리셋 */
export type BoardPeriodPreset = "all" | "today" | "week" | "month";

export function resolvePeriodRange(preset: BoardPeriodPreset): { from?: Date; to?: Date } {
  if (preset === "all") return {};
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (preset === "week") from.setDate(from.getDate() - 6);
  else if (preset === "month") from.setMonth(from.getMonth() - 1);
  return { from, to };
}

export const ANABADA_SALE_STATUSES = [
  { value: "selling", label: "판매중" },
  { value: "reserved", label: "예약중" },
  { value: "completed", label: "완료" },
] as const;

export type AnabadaSaleStatus = (typeof ANABADA_SALE_STATUSES)[number]["value"];

export function saleStatusLabel(status: string | null | undefined) {
  return ANABADA_SALE_STATUSES.find((s) => s.value === status)?.label ?? status ?? "";
}

export function splitHighlightParts(text: string, query?: string): { text: string; match: boolean }[] {
  if (!query?.trim()) return [{ text, match: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  return text.split(re).filter(Boolean).map((part) => ({
    text: part,
    match: part.toLowerCase() === query.toLowerCase(),
  }));
}
