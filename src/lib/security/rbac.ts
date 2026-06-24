import "server-only";

import type { Role } from "@/lib/auth/roles";
import { ROLE_RANK } from "@/lib/auth/roles";
import { canAccessBoard } from "@/lib/auth/access";

/** API/Server Action 공통 RBAC 점검 유틸 */

export function requireRole(userRole: Role | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

export function requireMinRole(userRole: Role | undefined, min: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}

export function canAccessBoardForRole(role: Role, boardKey: string): boolean {
  return canAccessBoard(role, boardKey);
}

/** API Route RBAC 매트릭스 (전수 점검 문서화) */
export const API_RBAC: Record<
  string,
  { auth: boolean; minRole?: Role; roles?: Role[]; note: string }
> = {
  "GET /api/health": { auth: false, note: "공개 헬스체크" },
  "POST /api/auth/register": { auth: false, note: "회원가입 (rate limit: auth)" },
  "GET/POST /api/auth/[...nextauth]": { auth: false, note: "NextAuth" },
  "GET /api/search": { auth: true, note: "로그인 사용자 + 보드 접근 필터" },
  "GET /api/boards/[key]/posts": { auth: true, note: "로그인 + 보드 접근" },
  "GET /api/files/[id]": { auth: true, note: "로그인 + 첨부 존재" },
  "POST /api/ai/chat": { auth: true, note: "로그인" },
  "POST /api/ai/draft": { auth: true, note: "로그인" },
  "POST /api/ai/draft/hint": { auth: true, note: "로그인" },
  "POST /api/ai/ingest": { auth: true, minRole: "ADMIN", note: "관리자만" },
  "POST /api/ai/news/collect": {
    auth: true,
    roles: ["ADMIN"],
    note: "관리자 또는 CRON_SECRET",
  },
};
