import "server-only";

import { prisma } from "@/lib/prisma";
import {
  BUILT_IN_TEMPLATES,
  BUILT_IN_THEMES,
} from "@/features/page-layout/built-in-data";
import { syncAllDealerPageThemes } from "@/features/page-layout/dealer-themes";
import {
  parsePostDetailSlug,
  postDetailSlugForPost,
} from "@/features/page-layout/post-layout";
import {
  getPageBuilderAccess,
  type PageBuilderUser,
} from "@/features/page-layout/permissions";
import { buildTemplateProjectData } from "@/features/page-layout/template-project-data";
import {
  boardLayoutSlug,
  CORE_PAGE_LAYOUT_SLUGS,
  CORE_PAGE_LAYOUT_LABELS,
  getPageLayoutLabel,
  GLOBAL_LAYOUT_SCOPE,
  isValidPageLayoutSlug,
  LEGACY_PR_SLUG,
  MAX_LAYOUT_VERSIONS,
  postDetailLayoutSlug,
  POST_DETAIL_BOARD_KEYS,
  type PageBuilderEditorData,
  type PageLayoutRecord,
  type PageLayoutVersionRecord,
  type PageTemplateRecord,
  type PageThemeRecord,
} from "@/features/page-layout/types";

const MAX_VERSIONS = MAX_LAYOUT_VERSIONS;

function hasLayoutContent(row: {
  html: string | null;
  projectData: unknown;
}): boolean {
  if (row.html?.trim()) return true;
  const pd = row.projectData as Record<string, unknown>;
  return Boolean(pd && Object.keys(pd).length > 0);
}

function layoutWhere(slug: string, dealerId = GLOBAL_LAYOUT_SCOPE) {
  return { slug_dealerId: { slug, dealerId } };
}

function mapTheme(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cssVars: unknown;
  canvasCss: string | null;
  isDefault: boolean;
  dealerId: string | null;
}): PageThemeRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    cssVars: (row.cssVars as Record<string, string>) ?? {},
    canvasCss: row.canvasCss,
    isDefault: row.isDefault,
    dealerId: row.dealerId,
  };
}

function mapTemplate(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  targetSlug: string;
  thumbnail: string | null;
  projectData: unknown;
  html: string | null;
  css: string | null;
  isBuiltIn: boolean;
  sortOrder: number;
  dealerId: string | null;
}): PageTemplateRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    targetSlug: row.targetSlug,
    thumbnail: row.thumbnail,
    projectData: (row.projectData as Record<string, unknown>) ?? {},
    html: row.html,
    css: row.css,
    isBuiltIn: row.isBuiltIn,
    sortOrder: row.sortOrder,
    dealerId: row.dealerId,
  };
}

function mapLayout(row: {
  id: string;
  slug: string;
  name: string;
  dealerId: string;
  projectData: unknown;
  html: string | null;
  css: string | null;
  isPublished: boolean;
  versionCount: number;
  themeId: string | null;
  updatedAt: Date;
}): PageLayoutRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    dealerId: row.dealerId,
    projectData: (row.projectData as Record<string, unknown>) ?? {},
    html: row.html,
    css: row.css,
    isPublished: row.isPublished,
    versionCount: row.versionCount,
    themeId: row.themeId,
    updatedAt: row.updatedAt,
  };
}

async function getBoardNameMap(): Promise<Record<string, string>> {
  const boards = await prisma.board.findMany({ select: { key: true, name: true } });
  return Object.fromEntries(boards.map((b) => [b.key, b.name]));
}

export async function ensurePageThemes(): Promise<void> {
  for (const theme of BUILT_IN_THEMES) {
    await prisma.pageTheme.upsert({
      where: { slug: theme.slug },
      create: {
        id: theme.id,
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        cssVars: theme.cssVars,
        canvasCss: theme.canvasCss,
        isDefault: theme.isDefault,
      },
      update: {
        name: theme.name,
        description: theme.description,
        cssVars: theme.cssVars,
        canvasCss: theme.canvasCss,
        isDefault: theme.isDefault,
      },
    });
  }
}

export async function ensurePageTemplates(): Promise<void> {
  for (const tpl of BUILT_IN_TEMPLATES) {
    const targetSlug =
      tpl.targetSlug === "pr" ? boardLayoutSlug("pr") : tpl.targetSlug;
    const projectData =
      tpl.projectData ?? buildTemplateProjectData(tpl.html, tpl.css);
    await prisma.pageTemplate.upsert({
      where: { slug: tpl.slug },
      create: {
        id: tpl.id,
        slug: tpl.slug,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        targetSlug,
        thumbnail: tpl.thumbnail,
        projectData: projectData as object,
        html: tpl.html,
        css: tpl.css,
        isBuiltIn: true,
        sortOrder: tpl.sortOrder,
      },
      update: {
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        targetSlug,
        thumbnail: tpl.thumbnail,
        html: tpl.html,
        css: tpl.css,
        sortOrder: tpl.sortOrder,
        projectData: projectData as object,
      },
    });
  }
}

async function migrateLegacyPrLayout(): Promise<void> {
  const legacy = await prisma.pageLayout.findUnique({
    where: layoutWhere(LEGACY_PR_SLUG),
  });
  if (!legacy?.html) return;

  const boardSlug = boardLayoutSlug("pr");
  const existing = await prisma.pageLayout.findUnique({
    where: layoutWhere(boardSlug),
  });
  if (!existing?.html) {
    await prisma.pageLayout.upsert({
      where: layoutWhere(boardSlug),
      create: {
        id: `pl_${boardSlug}`,
        slug: boardSlug,
        name: "게시판: 홍보실",
        dealerId: GLOBAL_LAYOUT_SCOPE,
        projectData: legacy.projectData as object,
        html: legacy.html,
        css: legacy.css,
        themeId: legacy.themeId,
        versionCount: legacy.versionCount,
      },
      update: {
        html: legacy.html,
        css: legacy.css,
        projectData: legacy.projectData as object,
      },
    });
  }
}

export async function ensureBoardPageLayouts(): Promise<void> {
  const boards = await prisma.board.findMany({ orderBy: { key: "asc" } });
  const defaultTheme = await prisma.pageTheme.findFirst({ where: { isDefault: true } });

  for (const board of boards) {
    const slug = boardLayoutSlug(board.key);
    await prisma.pageLayout.upsert({
      where: layoutWhere(slug),
      create: {
        id: `pl_${slug.replace(":", "_")}`,
        slug,
        name: `게시판: ${board.name}`,
        dealerId: GLOBAL_LAYOUT_SCOPE,
        projectData: {},
        themeId: defaultTheme?.id ?? null,
      },
      update: {},
    });
  }
}

export async function ensurePageLayouts(): Promise<void> {
  const defaultTheme = await prisma.pageTheme.findFirst({ where: { isDefault: true } });

  for (const slug of CORE_PAGE_LAYOUT_SLUGS) {
    await prisma.pageLayout.upsert({
      where: layoutWhere(slug),
      create: {
        id: `pl_${slug}`,
        slug,
        name: CORE_PAGE_LAYOUT_LABELS[slug],
        dealerId: GLOBAL_LAYOUT_SCOPE,
        projectData: {},
        themeId: defaultTheme?.id ?? null,
      },
      update: {},
    });
  }

  await ensureBoardPageLayouts();
  await ensurePostDetailLayouts();
  await migrateLegacyPrLayout();
}

export async function ensurePostDetailLayouts(): Promise<void> {
  const defaultTheme = await prisma.pageTheme.findFirst({ where: { isDefault: true } });

  for (const boardKey of POST_DETAIL_BOARD_KEYS) {
    const slug = postDetailLayoutSlug(boardKey);
    const boards = await prisma.board.findUnique({ where: { key: boardKey } });
    const name = boards ? `상세: ${boards.name}` : `상세: ${boardKey}`;

    await prisma.pageLayout.upsert({
      where: layoutWhere(slug),
      create: {
        id: `pl_${slug.replace(/:/g, "_")}`,
        slug,
        name,
        dealerId: GLOBAL_LAYOUT_SCOPE,
        projectData: {},
        themeId: defaultTheme?.id ?? null,
      },
      update: {},
    });
  }
}

export async function ensurePageBuilderData(): Promise<void> {
  await ensurePageThemes();
  await ensurePageTemplates();
  await ensurePageLayouts();
  await syncAllDealerPageThemes();
}

export async function getPageBuilderEditorData(
  user: PageBuilderUser,
): Promise<PageBuilderEditorData> {
  await ensurePageBuilderData();
  const access = getPageBuilderAccess(user);
  const boardNames = await getBoardNameMap();

  const [globalLayouts, dealerLayouts, themes, templates, dealers, postPosts, postSlugLayouts] =
    await Promise.all([
      prisma.pageLayout.findMany({
        where: { dealerId: GLOBAL_LAYOUT_SCOPE },
        orderBy: [{ slug: "asc" }],
      }),
      access.lockedDealerId
        ? prisma.pageLayout.findMany({
            where: { dealerId: access.lockedDealerId },
            orderBy: [{ slug: "asc" }],
          })
        : Promise.resolve([]),
      prisma.pageTheme.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      }),
      prisma.pageTemplate.findMany({
        orderBy: [{ targetSlug: "asc" }, { sortOrder: "asc" }],
      }),
      access.isHqAdmin
        ? prisma.dealer.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true },
          })
        : Promise.resolve([]),
      prisma.post.findMany({
        where: { board: { key: { in: [...POST_DETAIL_BOARD_KEYS] } } },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          board: { select: { key: true } },
        },
      }),
      prisma.pageLayout.findMany({
        where: {
          slug: { startsWith: "post-detail:" },
          NOT: {
            slug: {
              in: POST_DETAIL_BOARD_KEYS.map((k) => postDetailLayoutSlug(k)),
            },
          },
          ...(access.lockedDealerId
            ? { dealerId: access.lockedDealerId }
            : { dealerId: GLOBAL_LAYOUT_SCOPE }),
        },
        select: { slug: true },
      }),
    ]);

  const layoutMap = new Map<string, ReturnType<typeof mapLayout>>();
  for (const row of globalLayouts) {
    layoutMap.set(row.slug, mapLayout(row));
  }
  for (const row of dealerLayouts) {
    layoutMap.set(row.slug, mapLayout(row));
  }

  const postTitles = Object.fromEntries(postPosts.map((p) => [p.id, p.title]));
  for (const row of postSlugLayouts) {
    if (!layoutMap.has(row.slug)) {
      layoutMap.set(row.slug, {
        id: `virtual_${row.slug}`,
        slug: row.slug,
        name: getPageLayoutLabel(row.slug, boardNames, postTitles),
        dealerId: access.lockedDealerId ?? GLOBAL_LAYOUT_SCOPE,
        projectData: {},
        html: null,
        css: null,
        isPublished: true,
        versionCount: 0,
        themeId: null,
        updatedAt: new Date(0),
      });
    }
  }

  const slugLabels = Object.fromEntries(
    [...layoutMap.values()].map((l) => [
      l.slug,
      getPageLayoutLabel(l.slug, boardNames, postTitles),
    ]),
  );

  const postLayoutPosts = postPosts.map((p) => ({
    id: p.id,
    title: p.title,
    boardKey: p.board.key,
    slug: postDetailSlugForPost(p.id),
  }));

  for (const post of postLayoutPosts) {
    slugLabels[post.slug] = getPageLayoutLabel(post.slug, boardNames, postTitles);
  }

  return {
    layouts: [...layoutMap.values()],
    themes: themes.map(mapTheme),
    templates: templates.map(mapTemplate),
    slugLabels,
    dealers,
    access: {
      isHqAdmin: access.isHqAdmin,
      isReadOnly: access.isReadOnly,
      lockedDealerId: access.lockedDealerId,
      defaultDealerScope: access.defaultDealerScope,
      canEditGlobal: access.canEditGlobal,
    },
    postLayoutPosts,
  };
}

export async function getPageLayoutByScope(
  slug: string,
  dealerId: string = GLOBAL_LAYOUT_SCOPE,
): Promise<PageLayoutRecord | null> {
  await ensurePageLayouts();
  const row = await prisma.pageLayout.findUnique({
    where: layoutWhere(slug, dealerId),
  });
  if (!row) return null;
  return mapLayout(row);
}

export async function applyPageTemplate(data: {
  templateId: string;
  slug: string;
  dealerId: string;
  updatedById: string;
}) {
  const template = await prisma.pageTemplate.findUnique({ where: { id: data.templateId } });
  if (!template) throw new Error("템플릿을 찾을 수 없습니다.");

  return savePageLayout({
    slug: data.slug,
    projectData: (template.projectData as Record<string, unknown>) ?? {},
    html: template.html ?? "",
    css: template.css ?? "",
    updatedById: data.updatedById,
    dealerId: data.dealerId,
    note: `템플릿 "${template.name}" 적용`,
  });
}

export async function listPageLayouts(user: PageBuilderUser): Promise<PageLayoutRecord[]> {
  const data = await getPageBuilderEditorData(user);
  return data.layouts;
}

export async function getPageLayout(
  slug: string,
  dealerId: string | null = null,
): Promise<PageLayoutRecord | null> {
  return getResolvedPageLayout(slug, dealerId);
}

export async function getResolvedPageLayout(
  slug: string,
  userDealerId: string | null,
): Promise<PageLayoutRecord | null> {
  await ensurePageLayouts();

  const normalizedSlug =
    slug === LEGACY_PR_SLUG ? boardLayoutSlug("pr") : slug;

  if (userDealerId) {
    const dealerLayout = await prisma.pageLayout.findUnique({
      where: layoutWhere(normalizedSlug, userDealerId),
    });
    if (dealerLayout && hasLayoutContent(dealerLayout)) {
      return mapLayout(dealerLayout);
    }
  }

  const global = await prisma.pageLayout.findUnique({
    where: layoutWhere(normalizedSlug),
  });
  if (!global) {
    if (normalizedSlug !== slug) {
      const legacy = await prisma.pageLayout.findUnique({ where: layoutWhere(slug) });
      return legacy ? mapLayout(legacy) : null;
    }
    return null;
  }
  return mapLayout(global);
}

export async function getBoardPageLayout(
  boardKey: string,
  userDealerId: string | null,
): Promise<PageLayoutRecord | null> {
  return getResolvedPageLayout(boardLayoutSlug(boardKey), userDealerId);
}

export async function getPostDetailPageLayout(
  boardKey: string,
  userDealerId: string | null,
): Promise<PageLayoutRecord | null> {
  return getResolvedPageLayout(postDetailLayoutSlug(boardKey), userDealerId);
}

export async function getPostDetailPageLayoutForView(
  postId: string,
  boardKey: string,
  userDealerId: string | null,
): Promise<PageLayoutRecord | null> {
  const postSlug = postDetailSlugForPost(postId);
  const postLayout = await getResolvedPageLayout(postSlug, userDealerId);
  if (postLayout && hasLayoutContent(postLayout)) {
    return postLayout;
  }
  return getPostDetailPageLayout(boardKey, userDealerId);
}

export async function listPageLayoutVersions(
  slug: string,
  dealerId = GLOBAL_LAYOUT_SCOPE,
): Promise<PageLayoutVersionRecord[]> {
  const layout = await prisma.pageLayout.findUnique({
    where: layoutWhere(slug, dealerId),
  });
  if (!layout) return [];

  return prisma.pageLayoutVersion.findMany({
    where: { layoutId: layout.id },
    orderBy: { version: "desc" },
    take: MAX_VERSIONS,
    select: {
      id: true,
      layoutId: true,
      version: true,
      note: true,
      createdById: true,
      createdAt: true,
    },
  });
}

export async function getPageLayoutVersion(versionId: string) {
  return prisma.pageLayoutVersion.findUnique({ where: { id: versionId } });
}

export async function savePageLayout(data: {
  slug: string;
  projectData: Record<string, unknown>;
  html: string;
  css: string;
  themeId?: string | null;
  updatedById: string;
  note?: string;
  dealerId?: string;
}) {
  if (!isValidPageLayoutSlug(data.slug)) {
    throw new Error("지원하지 않는 slug");
  }

  await ensurePageLayouts();
  const dealerId = data.dealerId ?? GLOBAL_LAYOUT_SCOPE;
  const parsedPostSlug = parsePostDetailSlug(data.slug);
  const postTitles =
    parsedPostSlug?.kind === "post"
      ? Object.fromEntries(
          (
            await prisma.post.findMany({
              where: { id: parsedPostSlug.postId },
              select: { id: true, title: true },
            })
          ).map((p) => [p.id, p.title]),
        )
      : undefined;
  const boardNames = await getBoardNameMap();
  const name = getPageLayoutLabel(data.slug, boardNames, postTitles);

  const existing = await prisma.pageLayout.findUnique({
    where: layoutWhere(data.slug, dealerId),
  });

  const nextVersion = (existing?.versionCount ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    if (existing && (existing.html || Object.keys(existing.projectData as object).length > 0)) {
      await tx.pageLayoutVersion.create({
        data: {
          layoutId: existing.id,
          version: existing.versionCount || nextVersion - 1,
          projectData: existing.projectData as object,
          html: existing.html,
          css: existing.css,
          note: data.note ?? `v${existing.versionCount || nextVersion - 1} 자동 저장`,
          createdById: data.updatedById,
        },
      });

      const oldVersions = await tx.pageLayoutVersion.findMany({
        where: { layoutId: existing.id },
        orderBy: { version: "desc" },
        skip: MAX_VERSIONS,
        select: { id: true },
      });
      if (oldVersions.length > 0) {
        await tx.pageLayoutVersion.deleteMany({
          where: { id: { in: oldVersions.map((v) => v.id) } },
        });
      }
    }

    const id = existing?.id ?? `pl_${data.slug.replace(":", "_")}_${dealerId === GLOBAL_LAYOUT_SCOPE ? "g" : dealerId.slice(0, 8)}`;

    return tx.pageLayout.upsert({
      where: layoutWhere(data.slug, dealerId),
      create: {
        id,
        slug: data.slug,
        name,
        dealerId,
        projectData: data.projectData as object,
        html: data.html,
        css: data.css,
        themeId: data.themeId ?? null,
        versionCount: nextVersion,
        updatedById: data.updatedById,
      },
      update: {
        name,
        projectData: data.projectData as object,
        html: data.html,
        css: data.css,
        themeId: data.themeId ?? undefined,
        versionCount: nextVersion,
        updatedById: data.updatedById,
      },
    });
  });
}

export async function restorePageLayoutVersion(data: {
  slug: string;
  versionId: string;
  updatedById: string;
  dealerId?: string;
}) {
  const version = await prisma.pageLayoutVersion.findUnique({
    where: { id: data.versionId },
    include: { layout: true },
  });

  const dealerId = data.dealerId ?? GLOBAL_LAYOUT_SCOPE;
  if (!version || version.layout.slug !== data.slug || version.layout.dealerId !== dealerId) {
    throw new Error("버전을 찾을 수 없습니다.");
  }

  return savePageLayout({
    slug: data.slug,
    projectData: version.projectData as Record<string, unknown>,
    html: version.html ?? "",
    css: version.css ?? "",
    themeId: version.layout.themeId,
    updatedById: data.updatedById,
    dealerId,
    note: `v${version.version} 복원`,
  });
}

export async function applyPageTheme(data: {
  slug: string;
  themeId: string;
  updatedById: string;
  dealerId?: string;
}) {
  await ensurePageLayouts();
  return prisma.pageLayout.update({
    where: layoutWhere(data.slug, data.dealerId ?? GLOBAL_LAYOUT_SCOPE),
    data: {
      themeId: data.themeId,
      updatedById: data.updatedById,
    },
  });
}

export async function getPageTheme(themeId: string | null): Promise<PageThemeRecord | null> {
  if (!themeId) return null;
  const row = await prisma.pageTheme.findUnique({ where: { id: themeId } });
  return row ? mapTheme(row) : null;
}

export async function migrateLegacyGridsToGrapes(data: {
  targets: { slug: string; html: string; css: string }[];
  updatedById: string;
}): Promise<number> {
  let count = 0;
  for (const target of data.targets) {
    const existing = await prisma.pageLayout.findUnique({
      where: layoutWhere(target.slug),
    });
    if (existing?.html?.trim()) continue;

    await savePageLayout({
      slug: target.slug,
      projectData: buildTemplateProjectData(target.html, target.css),
      html: target.html,
      css: target.css,
      updatedById: data.updatedById,
      note: "레거시 그리드 마이그레이션",
    });
    count++;
  }
  return count;
}
