"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createFeedback } from "@/features/pilot/feedback-service";
import {
  createPilotGroup,
  deletePilotGroup,
  setPilotGroupMembers,
  updatePilotSettings,
} from "@/features/pilot/pilot-service";
import type { FeedbackCategory } from "@/features/pilot/types";
import { writeAudit, getClientIp } from "@/lib/audit/service";
import { requireRole, requireUser } from "@/lib/auth/session";
import { trackUsage } from "@/lib/pilot/monitoring";

const FEEDBACK_CATS = new Set<FeedbackCategory>(["usability", "bug", "feature", "other"]);

export async function savePilotSettingsAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  await updatePilotSettings({
    isActive: formData.get("isActive") === "on",
    bannerTitle: String(formData.get("bannerTitle") ?? "").trim() || undefined,
    bannerMessage: String(formData.get("bannerMessage") ?? "").trim() || undefined,
    feedbackEnabled: formData.get("feedbackEnabled") === "on",
  });
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: user.id,
    userEmail: user.email ?? undefined,
    ip: getClientIp(await headers()),
    resource: "pilot_settings",
    detail: "pilot_settings_update",
  });
  revalidatePath("/admin/pilot");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePilotGroupMembersAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const groupId = String(formData.get("groupId") ?? "");
  const userIds = formData.getAll("userIds").map(String).filter(Boolean);
  if (!groupId) return { error: "그룹 ID가 필요합니다." };
  await setPilotGroupMembers(groupId, userIds);
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: user.id,
    userEmail: user.email ?? undefined,
    ip: getClientIp(await headers()),
    resource: groupId,
    detail: `pilot_members:${userIds.length}`,
  });
  revalidatePath("/admin/pilot");
  return { ok: true };
}

export async function createPilotGroupAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!key || !name) return { error: "key와 이름을 입력하세요." };
  try {
    await createPilotGroup({ key, name, description: description || undefined });
  } catch {
    return { error: "이미 존재하는 key입니다." };
  }
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: user.id,
    userEmail: user.email ?? undefined,
    ip: getClientIp(await headers()),
    resource: key,
    detail: "pilot_group_create",
  });
  revalidatePath("/admin/pilot");
  return { ok: true };
}

export async function deletePilotGroupAction(id: string) {
  const user = await requireRole(["ADMIN"]);
  await deletePilotGroup(id);
  void writeAudit({
    action: "SITE_CUSTOMIZE",
    userId: user.id,
    userEmail: user.email ?? undefined,
    ip: getClientIp(await headers()),
    resource: id,
    detail: "pilot_group_delete",
  });
  revalidatePath("/admin/pilot");
  return { ok: true };
}

export async function submitPilotFeedbackAction(formData: FormData) {
  const user = await requireUser();
  const category = String(formData.get("category") ?? "") as FeedbackCategory;
  const rating = Number(formData.get("rating") ?? 0);
  const message = String(formData.get("message") ?? "").trim();
  const pageUrl = String(formData.get("pageUrl") ?? "").trim() || undefined;

  if (!FEEDBACK_CATS.has(category)) return { error: "카테고리를 선택하세요." };
  if (!message || message.length < 5) return { error: "피드백을 5자 이상 입력하세요." };
  if (rating < 1 || rating > 5) return { error: "만족도(1~5)를 선택하세요." };

  await createFeedback({ userId: user.id, category, rating, message, pageUrl });
  void writeAudit({
    action: "PILOT_FEEDBACK",
    userId: user.id,
    userEmail: user.email ?? undefined,
    ip: getClientIp(await headers()),
    resource: category,
    detail: message.slice(0, 200),
  });
  revalidatePath("/admin/pilot");
  return { ok: true };
}

export async function trackPilotUsageAction(event: string, resource?: string) {
  const user = await requireUser();
  await trackUsage({ userId: user.id, event, resource });
  return { ok: true };
}
