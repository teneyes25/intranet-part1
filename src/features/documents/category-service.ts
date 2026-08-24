import "server-only";

import { prisma } from "@/lib/prisma";

export function listDocumentCategories() {
  return prisma.documentCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true, approvals: true } },
    },
  });
}

export async function createDocumentCategory(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  const count = await prisma.documentCategory.count();
  return prisma.documentCategory.create({
    data: {
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: data.description?.trim() || null,
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

export async function deleteDocumentCategory(id: string) {
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
    orderBy: { sortOrder: "asc" },
  });
  return first?.id ?? null;
}
