"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  createApprovalLineTemplate,
  createApprovalTemplate,
  deleteApprovalLineTemplate,
  deleteApprovalTemplate,
  updateApprovalLineTemplate,
  updateApprovalTemplate,
} from "@/features/customize/approval-service";
import { runIngestJob } from "@/features/customize/ai-ingest-service";
import { updateIntegration } from "@/features/customize/integration-service";
import {
  parseDashboardLayout,
  updateSiteSettings,
  getSiteSettings,
} from "@/features/customize/site-settings-service";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type ApprovalLineStep,
  type DashboardLayoutConfig,
} from "@/features/customize/types";
import { writeAudit, getClientIp } from "@/lib/audit/service";
import { requireRole } from "@/lib/auth/session";
import { deleteBrandingFile, saveBrandingFile } from "@/lib/branding/storage";

async function auditAdmin(
  action: Parameters<typeof writeAudit>[0]["action"],
  userId: string,
  email: string | null | undefined,
  resource: string,
  detail: string,
) {
  const h = await headers();
  void writeAudit({
    action,
    userId,
    userEmail: email ?? undefined,
    ip: getClientIp(h),
    resource,
    detail,
  });
}

export async function saveDesignSettingsAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const appName = String(formData.get("appName") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const sidebarColor = String(formData.get("sidebarColor") ?? "").trim();
  const sidebarForeground = String(formData.get("sidebarForeground") ?? "").trim();
  const layoutRaw = String(formData.get("dashboardLayout") ?? "");

  let dashboardLayout: DashboardLayoutConfig | undefined;
  if (layoutRaw) {
    try {
      dashboardLayout = parseDashboardLayout(JSON.parse(layoutRaw));
    } catch {
      return { error: "레이아웃 JSON 형식이 올바르지 않습니다." };
    }
  }

  const current = await getSiteSettings();
  const patch: Parameters<typeof updateSiteSettings>[0] = {
    updatedById: user.id,
    ...(appName && { appName }),
    ...(primaryColor && { primaryColor }),
    ...(sidebarColor && { sidebarColor }),
    ...(sidebarForeground && { sidebarForeground }),
    ...(dashboardLayout && { dashboardLayout }),
  };

  for (const kind of ["logo", "favicon", "banner"] as const) {
    const file = formData.get(kind);
    if (file instanceof File && file.size > 0) {
      try {
        const saved = await saveBrandingFile(file, kind);
        if (kind === "logo") {
          await deleteBrandingFile(current.logoStorageKey);
          patch.logoStorageKey = saved.storageKey;
        } else if (kind === "favicon") {
          await deleteBrandingFile(current.faviconStorageKey);
          patch.faviconStorageKey = saved.storageKey;
        } else {
          await deleteBrandingFile(current.bannerStorageKey);
          patch.bannerStorageKey = saved.storageKey;
          patch.bannerMediaType = saved.mediaType;
        }
      } catch (e) {
        return { error: e instanceof Error ? e.message : "파일 업로드 실패" };
      }
    }
  }

  await updateSiteSettings(patch);
  await auditAdmin("SITE_CUSTOMIZE", user.id, user.email, "site_settings", "design_updated");
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/admin/customize");
  return { ok: true };
}

export async function resetDashboardLayoutAction() {
  const user = await requireRole(["ADMIN"]);
  await updateSiteSettings({
    updatedById: user.id,
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
  });
  await auditAdmin("SITE_CUSTOMIZE", user.id, user.email, "dashboard_layout", "reset_default");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function runAiIngestAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const scope = String(formData.get("scope") ?? "all") as "all" | "boards";
  const boardKeys = formData.getAll("boardKeys").map(String).filter(Boolean);

  try {
    const result = await runIngestJob({
      triggeredById: user.id,
      scope,
      boardKeys: scope === "boards" ? boardKeys : [],
    });
    await auditAdmin(
      "AI_INGEST_RUN",
      user.id,
      user.email,
      result.jobId,
      scope === "all" ? "full_reindex" : `boards:${boardKeys.join(",")}`,
    );
    revalidatePath("/admin/customize");
    return { ok: true, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "재학습 실패" };
  }
}

export async function saveApprovalTemplateAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const content = String(formData.get("content") ?? "");

  if (!name) return { error: "서식 이름을 입력하세요." };
  if (!content.trim()) return { error: "서식 본문을 입력하세요." };

  if (id) {
    await updateApprovalTemplate(id, { name, description, content });
    await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, id, "template_update");
  } else {
    if (!key) return { error: "서식 key를 입력하세요." };
    await createApprovalTemplate({ key, name, description, content });
    await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, key, "template_create");
  }

  revalidatePath("/admin/customize");
  revalidatePath("/approval/new");
  return { ok: true };
}

export async function deleteApprovalTemplateAction(id: string) {
  const user = await requireRole(["ADMIN"]);
  await deleteApprovalTemplate(id);
  await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, id, "template_delete");
  revalidatePath("/admin/customize");
  return { ok: true };
}

export async function saveApprovalLineTemplateAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const targetRole = String(formData.get("targetRole") ?? "").trim() || null;
  const isDefault = formData.get("isDefault") === "on";
  let steps: ApprovalLineStep[] = [];
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    return { error: "결재선 JSON 형식이 올바르지 않습니다." };
  }
  if (!name) return { error: "템플릿 이름을 입력하세요." };
  if (steps.length === 0) return { error: "결재자를 1명 이상 지정하세요." };

  const payload = {
    name,
    department,
    targetRole,
    steps,
    isDefault,
  };

  if (id) {
    await updateApprovalLineTemplate(id, payload);
    await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, id, "line_template_update");
  } else {
    await createApprovalLineTemplate(payload);
    await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, name, "line_template_create");
  }

  revalidatePath("/admin/customize");
  return { ok: true };
}

export async function deleteApprovalLineTemplateAction(id: string) {
  const user = await requireRole(["ADMIN"]);
  await deleteApprovalLineTemplate(id);
  await auditAdmin("APPROVAL_CUSTOMIZE", user.id, user.email, id, "line_template_delete");
  revalidatePath("/admin/customize");
  return { ok: true };
}

export async function saveIntegrationAction(formData: FormData) {
  const user = await requireRole(["ADMIN"]);
  const provider = String(formData.get("provider") ?? "");
  const ALLOWED_PROVIDERS = new Set(["instagram", "company_web"]);
  if (!ALLOWED_PROVIDERS.has(provider)) return { error: "지원하지 않는 연동 provider입니다." };

  const patch: Parameters<typeof updateIntegration>[1] = {
    isEnabled: formData.get("isEnabled") === "on",
  };
  for (const field of ["apiKey", "apiSecret", "accessToken", "webhookUrl"] as const) {
    const value = String(formData.get(field) ?? "").trim();
    if (value) patch[field] = value;
  }

  await updateIntegration(provider, patch);

  await auditAdmin("INTEGRATION_UPDATE", user.id, user.email, provider, "integration_save");
  revalidatePath("/admin/customize");
  return { ok: true };
}
