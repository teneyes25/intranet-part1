"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSiteSettings, parsePageBuilderConfigForMigration } from "@/features/customize/site-settings-service";
import { stripPageBuilderGrids } from "@/features/customize/page-builder/migrate";
import { buildLegacyMigrationTargets } from "@/features/page-layout/legacy-migrate";
import { parsePostDetailSlug } from "@/features/page-layout/post-layout";
import {
  assertCanMutatePageLayout,
  assertDealerScopeAllowed,
  requirePageBuilderAccess,
  resolveDealerScopeForSave,
} from "@/features/page-layout/permissions";
import {
  applyPageTemplate,
  applyPageTheme,
  getPageLayoutByScope,
  listPageLayoutVersions,
  migrateLegacyGridsToGrapes,
  restorePageLayoutVersion,
  savePageLayout,
} from "@/features/page-layout/service";
import {
  boardKeyFromLayoutSlug,
  isPostDetailLayoutSlug,
  isValidPageLayoutSlug,
  POST_DETAIL_BOARD_KEYS,
  type SavePageLayoutPayload,
} from "@/features/page-layout/types";
import { writeAudit, getClientIp } from "@/lib/audit/service";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { updateSiteSettings } from "@/features/customize/site-settings-service";

async function revalidateLayoutPaths(slug: string) {
  revalidatePath("/admin/customize/page-builder");
  revalidatePath("/admin/customize");

  if (slug === "dashboard" || slug === "banner") {
    revalidatePath("/dashboard");
  }

  const boardKey = boardKeyFromLayoutSlug(slug);
  if (boardKey && (POST_DETAIL_BOARD_KEYS as readonly string[]).includes(boardKey)) {
    revalidatePath(`/boards/${boardKey}`);
    if (isPostDetailLayoutSlug(slug)) {
      revalidatePath(`/boards/${boardKey}`, "layout");
    }
    return;
  }

  const parsed = parsePostDetailSlug(slug);
  if (parsed?.kind === "post") {
    const post = await prisma.post.findUnique({
      where: { id: parsed.postId },
      select: { board: { select: { key: true } } },
    });
    if (post) {
      revalidatePath(`/boards/${post.board.key}/${parsed.postId}`);
    }
    return;
  }

  if (boardKey) {
    revalidatePath(`/boards/${boardKey}`);
  }
}

export async function loadPageLayoutAction(slug: string, dealerId: string) {
  const { access } = await requirePageBuilderAccess();
  if (!isValidPageLayoutSlug(slug)) return { error: "지원하지 않는 slug" };

  const scope = resolveDealerScopeForSave(access, dealerId || undefined);
  try {
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  const layout = await getPageLayoutByScope(slug, scope);
  return { ok: true, layout };
}

export async function savePageLayoutAction(payload: SavePageLayoutPayload) {
  const { user, access } = await requirePageBuilderAccess();

  if (!isValidPageLayoutSlug(payload.slug)) {
    return { error: "지원하지 않는 페이지 slug입니다." };
  }

  const scope = resolveDealerScopeForSave(access, payload.dealerId);
  try {
    assertCanMutatePageLayout(access);
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  try {
    await savePageLayout({
      slug: payload.slug,
      projectData: payload.projectData,
      html: payload.html,
      css: payload.css,
      themeId: payload.themeId,
      updatedById: user.id,
      note: payload.note ?? "저장 (자동 백업)",
      dealerId: scope,
    });

    const h = await headers();
    void writeAudit({
      action: "SITE_CUSTOMIZE",
      userId: user.id,
      userEmail: user.email ?? undefined,
      ip: getClientIp(h),
      resource: `page_layout:${payload.slug}:${scope}`,
      detail: "grapesjs_saved",
    });

    revalidateLayoutPaths(payload.slug);
    return { ok: true };
  } catch {
    return { error: "레이아웃 저장에 실패했습니다." };
  }
}

export async function applyPageTemplateAction(
  templateId: string,
  slug: string,
  dealerId: string,
) {
  const { user, access } = await requirePageBuilderAccess();

  if (!isValidPageLayoutSlug(slug)) {
    return { error: "지원하지 않는 페이지 slug입니다." };
  }

  const scope = resolveDealerScopeForSave(access, dealerId || undefined);
  try {
    assertCanMutatePageLayout(access);
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  try {
    await applyPageTemplate({
      templateId,
      slug,
      dealerId: scope,
      updatedById: user.id,
    });
    revalidateLayoutPaths(slug);
    return { ok: true };
  } catch {
    return { error: "템플릿 적용에 실패했습니다." };
  }
}

export async function applyPageThemeAction(
  slug: string,
  themeId: string,
  dealerId?: string,
) {
  const { user, access } = await requirePageBuilderAccess();

  if (!isValidPageLayoutSlug(slug)) {
    return { error: "지원하지 않는 페이지 slug입니다." };
  }

  const scope = resolveDealerScopeForSave(access, dealerId);
  try {
    assertCanMutatePageLayout(access);
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  try {
    await applyPageTheme({
      slug,
      themeId,
      updatedById: user.id,
      dealerId: scope,
    });
    revalidateLayoutPaths(slug);
    return { ok: true };
  } catch {
    return { error: "테마 적용에 실패했습니다." };
  }
}

export async function listPageLayoutVersionsAction(slug: string, dealerId?: string) {
  const { access } = await requirePageBuilderAccess();
  if (!isValidPageLayoutSlug(slug)) return { error: "지원하지 않는 slug" };

  const scope = resolveDealerScopeForSave(access, dealerId);
  try {
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  const versions = await listPageLayoutVersions(slug, scope);
  return { ok: true, versions };
}

export async function restorePageLayoutVersionAction(
  slug: string,
  versionId: string,
  dealerId?: string,
) {
  const { user, access } = await requirePageBuilderAccess();

  if (!isValidPageLayoutSlug(slug)) {
    return { error: "지원하지 않는 페이지 slug입니다." };
  }

  const scope = resolveDealerScopeForSave(access, dealerId);
  try {
    assertCanMutatePageLayout(access);
    assertDealerScopeAllowed(access, scope);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "권한이 없습니다." };
  }

  try {
    await restorePageLayoutVersion({
      slug,
      versionId,
      updatedById: user.id,
      dealerId: scope,
    });
    revalidateLayoutPaths(slug);
    return { ok: true };
  } catch {
    return { error: "버전 복원에 실패했습니다." };
  }
}

export async function migrateLegacyGridsAction() {
  const user = await requireRole(["ADMIN"]);

  try {
    const settings = await getSiteSettings();
    const config = parsePageBuilderConfigForMigration(settings.pageBuilderConfig);
    const targets = buildLegacyMigrationTargets(config);

    if (targets.length === 0) {
      return { error: "마이그레이션할 레거시 그리드 콘텐츠가 없습니다." };
    }

    const count = await migrateLegacyGridsToGrapes({
      targets,
      updatedById: user.id,
    });

    await updateSiteSettings({
      updatedById: user.id,
      pageBuilderConfig: stripPageBuilderGrids(config),
    });

    const h = await headers();
    void writeAudit({
      action: "SITE_CUSTOMIZE",
      userId: user.id,
      userEmail: user.email ?? undefined,
      ip: getClientIp(h),
      resource: "page_layout:legacy_migrate",
      detail: `migrated=${count}`,
    });

    revalidatePath("/admin/customize");
    revalidatePath("/admin/customize/page-builder");
    revalidatePath("/dashboard");
    revalidatePath("/boards/pr");

    return { ok: true, count };
  } catch {
    return { error: "레거시 마이그레이션에 실패했습니다." };
  }
}
