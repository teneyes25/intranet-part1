import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("audit");

export type AuditActionType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "APPROVAL_SUBMIT"
  | "APPROVAL_APPROVE"
  | "APPROVAL_EXECUTE"
  | "APPROVAL_REJECT"
  | "AI_CHAT"
  | "AI_DRAFT"
  | "AI_NEWS_COLLECT"
  | "FILE_UPLOAD"
  | "USER_APPROVE"
  | "USER_REJECT"
  | "SITE_CUSTOMIZE"
  | "AI_INGEST_RUN"
  | "APPROVAL_CUSTOMIZE"
  | "INTEGRATION_UPDATE"
  | "PILOT_FEEDBACK"
  | "SYSTEM_ERROR"
  | "USAGE_EVENT"
  | "PASSWORD_CHANGE"
  | "BULK_USER_IMPORT"
  | "EMERGENCY_NOTICE"
  | "DEALER_ROLLOUT"
  | "DEALER_IMPORT"
  | "ORDER_CREATE";

export interface AuditEntry {
  action: AuditActionType;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  resource?: string | null;
  detail?: string | null;
  success?: boolean;
}

export async function writeAudit(entry: AuditEntry) {
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, action, "userId", "userEmail", ip, "userAgent", resource, detail, success, "createdAt")
      VALUES (
        ${randomUUID()},
        ${entry.action}::"AuditAction",
        ${entry.userId ?? null},
        ${entry.userEmail ?? null},
        ${entry.ip ?? null},
        ${entry.userAgent?.slice(0, 512) ?? null},
        ${entry.resource?.slice(0, 255) ?? null},
        ${entry.detail?.slice(0, 2000) ?? null},
        ${entry.success ?? true},
        NOW()
      )
    `;
  } catch (e) {
    log.error({ err: e, action: entry.action }, "audit write failed");
  }
}

export function getClientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}
