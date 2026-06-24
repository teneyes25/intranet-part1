import type { Role } from "./roles";
import {
  canAccessBoard as dealerCanAccessBoard,
  canAccessFeature,
  getReadableBoardKeys,
} from "@/lib/dealer/access";
import { hasMinRole } from "./roles";

export function canAccessBoard(role: Role, boardKey: string): boolean {
  return dealerCanAccessBoard(role, boardKey);
}

export { canAccessFeature, getReadableBoardKeys };

/** 메뉴 노출 여부 (excludeRoles / minRole 지원) */
export function canSeeNavItem(
  role: Role | undefined,
  item: { roles?: Role[]; minRole?: Role; excludeRoles?: Role[] },
): boolean {
  if (!role) return false;
  if (item.excludeRoles?.includes(role)) return false;
  if (item.roles?.length) return item.roles.includes(role);
  if (item.minRole) return hasMinRole(role, item.minRole);
  return true;
}

export { getDealerScope } from "@/lib/dealer/access";
