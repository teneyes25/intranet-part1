import type { Role } from "@/lib/auth/roles";

/**
 * 게시판 글쓰기 권한.
 * - ADMIN: 모든 게시판 작성 가능
 * - 그 외: 로그인 사용자는 모든 게시판에 새 글 작성 가능
 */
export function canWriteBoard(
  role: Role | undefined,
  writeRoles: Role[] = [],
): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;
  if (writeRoles.length === 0) return true;
  return writeRoles.includes(role);
}

/**
 * 게시글 수정/삭제 권한.
 * - ADMIN: 모든 글
 * - 그 외: 본인이 작성한 글만
 */
export function canManagePost(
  user: { id: string; role: Role } | undefined,
  authorId: string,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.id === authorId;
}

/** 모든 인증 사용자는 게시글 읽기 가능 */
export function canReadPost(user: { id: string } | undefined): boolean {
  return Boolean(user);
}
