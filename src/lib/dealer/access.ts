import type { Role } from "@/lib/auth/roles";
import { hasMinRole } from "@/lib/auth/roles";

/** 본사 전용 기능 — 대리점 DEALER 는 접근 불가 */
const HQ_ONLY_BOARDS = new Set(["pr"]);
const HQ_ONLY_FEATURES = new Set(["attendance"]);

export function canAccessBoard(role: Role, boardKey: string): boolean {
  if (HQ_ONLY_BOARDS.has(boardKey) && role === "DEALER") return false;
  if (boardKey === "pr") return hasMinRole(role, "HEADQUARTER");
  return true;
}

export function canAccessFeature(role: Role, featureKey: string): boolean {
  if (HQ_ONLY_FEATURES.has(featureKey) && role === "DEALER") return false;
  if (featureKey === "attendance") return hasMinRole(role, "HEADQUARTER");
  return true;
}

/** 역할별 읽기 가능 게시판 */
export function getReadableBoardKeys(role: Role): string[] {
  const workspace = ["notices", "schedule", "general", "news"];
  const documentBoxes = [
    "goals",
    "regulations",
    "market-trends",
    "products",
    "pr",
  ];
  if (hasMinRole(role, "HEADQUARTER")) {
    return [...workspace, ...documentBoxes];
  }
  // 대리점도 문서함 하위 게시판 열람 가능 (홍보실 제외는 canAccessBoard)
  return [...workspace, "goals", "regulations", "market-trends", "products"];
}

/** 대리점 사용자 데이터 스코프 — 본사/ADMIN 은 null (전체) */
export function getDealerScope(role: Role, dealerId: string | null): string | null {
  if (role === "DEALER") return dealerId;
  return null;
}
