import { knowledgeTenantId } from "./flags";
import type { UserContext, SyncServiceContext } from "./types";

/**
 * Server-built user context. Groups come only from knowledge_staff_groups.
 * Intranet role does not grant sales/design/common. Missing active or
 * approval status is fail-closed. Never parse this from a request body.
 */
export function userContextFromSession(user: {
  id: string;
  isActive?: boolean | null;
  approvalStatus?: string | null;
  groups?: readonly string[] | null;
}): UserContext {
  const active = user.isActive === true && user.approvalStatus === "APPROVED";
  const groups = Array.isArray(user.groups)
    ? user.groups.filter((group) => typeof group === "string" && group.length > 0)
    : [];
  return {
    kind: "user",
    tenantId: knowledgeTenantId(),
    userId: user.id,
    active,
    groups,
  };
}

export function syncServiceContext(): SyncServiceContext {
  return { kind: "sync-service", tenantId: knowledgeTenantId() };
}
