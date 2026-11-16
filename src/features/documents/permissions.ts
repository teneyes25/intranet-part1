import type { Role } from "@/lib/auth/roles";

/** 문서함 생성·수정·삭제 가능 여부 */
export function canManageDocumentBoxes(params: {
  role: Role;
  isDesignatedManager: boolean;
}): boolean {
  if (params.role === "ADMIN") return true;
  return params.isDesignatedManager;
}

/** 특정 문서함 수정·삭제 가능 여부 */
export function canManageDocumentBox(params: {
  role: Role;
  isManagerOfBox: boolean;
  isDesignatedManager: boolean;
}): boolean {
  if (params.role === "ADMIN") return true;
  return params.isManagerOfBox || params.isDesignatedManager;
}

/** 문서함 관리자 지정은 ADMIN 만 */
export function canAssignDocumentBoxManagers(role: Role): boolean {
  return role === "ADMIN";
}
