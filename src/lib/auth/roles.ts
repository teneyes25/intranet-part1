/**
 * 권한(Role) 정의.
 *
 * 주의: 이 모듈은 Edge 런타임(미들웨어)에서도 import 되므로
 * `@prisma/client` 같은 Node 전용 패키지를 런타임으로 가져오지 않는다.
 * Prisma schema 의 `enum Role` 과 값이 동일하게 유지되어야 한다.
 */
export const ROLES = ["HEADQUARTER", "DEALER", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

/// 권한 한글 라벨
export const ROLE_LABELS: Record<Role, string> = {
  HEADQUARTER: "본사",
  DEALER: "대리점",
  ADMIN: "관리자",
};

/// 권한 우선순위 (숫자가 높을수록 강한 권한)
export const ROLE_RANK: Record<Role, number> = {
  DEALER: 1,
  HEADQUARTER: 2,
  ADMIN: 3,
};

/**
 * 사용자의 role 이 허용된 role 목록에 포함되는지 검사.
 */
export function hasRole(
  userRole: Role | undefined | null,
  allowed: Role[],
): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}

/**
 * 최소 권한 등급 이상인지 검사 (계층적 권한).
 */
export function hasMinRole(
  userRole: Role | undefined | null,
  min: Role,
): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}
