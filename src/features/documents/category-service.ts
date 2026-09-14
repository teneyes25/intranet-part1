import "server-only";

import { prisma } from "@/lib/prisma";

export function listDocumentCategories(opts?: { userId?: string; includeOwned?: boolean }) {
  return prisma.documentCategory.findMany({
    where: opts?.includeOwned && opts.userId
      ? { OR: [{ ownerId: null }, { ownerId: opts.userId }] }
      : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true, approvals: true } },
      owner: { select: { id: true, name: true } },
    },
  });
}

/** 기안 시 선택 가능한 문서함: 공용 + 본인 소유 */
export function listSelectableDocumentCategories(userId: string) {
  return prisma.documentCategory.findMany({
    where: { OR: [{ ownerId: null }, { ownerId: userId }] },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createDocumentCategory(data: {
  name: string;
  slug: string;
  description?: string;
  workTypeCode?: string;
  ownerId?: string | null;
  retentionYears?: number | null;
  isPublic?: boolean;
}) {
  const count = await prisma.documentCategory.count({
    where: data.ownerId ? { ownerId: data.ownerId } : { ownerId: null },
  });
  const slugBase = data.slug.trim().toLowerCase().replace(/\s+/g, "-") || "folder";
  let slug = slugBase;
  const clash = await prisma.documentCategory.findUnique({ where: { slug } });
  if (clash) slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;

  return prisma.documentCategory.create({
    data: {
      name: data.name.trim(),
      slug,
      description: data.description?.trim() || null,
      workTypeCode: data.workTypeCode?.trim() || data.name.trim().slice(0, 20),
      ownerId: data.ownerId ?? null,
      retentionYears: data.retentionYears ?? null,
      isPublic: data.isPublic ?? !data.ownerId,
      sortOrder: count,
    },
  });
}

/** 이름 변경 시 문서함·레거시 category 문자열 동기화 */
export async function updateDocumentCategory(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    sortOrder: number;
    workTypeCode: string | null;
    retentionYears: number | null;
    isPublic: boolean;
  }>,
) {
  const updated = await prisma.documentCategory.update({
    where: { id },
    data,
  });

  if (data.name) {
    await prisma.sharedDocument.updateMany({
      where: { documentCategoryId: id },
      data: { category: data.name },
    });
  }

  return updated;
}

/**
 * 문서함 삭제.
 * moveToCategoryId 가 있으면 문서·기안을 해당 함으로 이동, 없으면 미분류(null).
 */
export async function deleteDocumentCategory(
  id: string,
  opts?: { moveToCategoryId?: string | null },
) {
  const moveTo = opts?.moveToCategoryId;
  if (moveTo === id) {
    throw new Error("같은 문서함으로는 이동할 수 없습니다.");
  }
  if (moveTo) {
    const target = await prisma.documentCategory.findUnique({
      where: { id: moveTo },
    });
    if (!target) throw new Error("이동할 문서함을 찾을 수 없습니다.");
    await prisma.$transaction([
      prisma.sharedDocument.updateMany({
        where: { documentCategoryId: id },
        data: { documentCategoryId: moveTo, category: target.name },
      }),
      prisma.approvalDocument.updateMany({
        where: { documentCategoryId: id },
        data: { documentCategoryId: moveTo },
      }),
      prisma.documentCategory.delete({ where: { id } }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.sharedDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    }),
    prisma.approvalDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    }),
    prisma.documentCategory.delete({ where: { id } }),
  ]);
}

/** 레거시 category 문자열 → documentCategoryId 백필 */
export async function backfillDocumentCategoryLinks() {
  const categories = await prisma.documentCategory.findMany();
  const byName = new Map(categories.map((c) => [c.name, c]));
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const orphans = await prisma.sharedDocument.findMany({
    where: { documentCategoryId: null, category: { not: null } },
    select: { id: true, category: true },
  });

  let linked = 0;
  for (const d of orphans) {
    const name = (d.category ?? "").trim();
    const cat = byName.get(name) ?? bySlug.get(name.toLowerCase());
    if (!cat) continue;
    await prisma.sharedDocument.update({
      where: { id: d.id },
      data: { documentCategoryId: cat.id, category: cat.name },
    });
    linked += 1;
  }
  return linked;
}

export async function getDefaultApprovalDocumentCategoryId() {
  const approval = await prisma.documentCategory.findUnique({
    where: { slug: "approval" },
  });
  if (approval) return approval.id;
  const first = await prisma.documentCategory.findFirst({
    where: { ownerId: null },
    orderBy: { sortOrder: "asc" },
  });
  return first?.id ?? null;
}
