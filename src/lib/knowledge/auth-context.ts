import type { Role } from "@/lib/auth/roles";
import { knowledgeTenantId } from "./flags";
import type { UserContext, SyncServiceContext } from "./types";

/**
 * Maps intranet roles to knowledge groups.
 * CTO review: DEALER is fail-closed (no default group) until PM assigns dealer shares.
 */
export function groupsForRole(role: Role): string[] {
  if (role === "ADMIN") return ["sales", "design", "common"];
  if (role === "HEADQUARTER") return ["sales", "common"];
  return [];
}

/** Server-built user context. Never parse this from a request body. */
export function userContextFromSession(user: {
  id: string;
  role: Role;
  isActive?: boolean;
  approvalStatus?: string;
}): UserContext {
  const active =
    user.isActive !== false &&
    (user.approvalStatus ? user.approvalStatus === "APPROVED" : true);
  return {
    kind: "user",
    tenantId: knowledgeTenantId(),
    userId: user.id,
    active,
    groups: groupsForRole(user.role),
  };
}

export function syncServiceContext(): SyncServiceContext {
  return { kind: "sync-service", tenantId: knowledgeTenantId() };
}
