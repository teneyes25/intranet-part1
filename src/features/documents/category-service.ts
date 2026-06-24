import "server-only";

import { prisma } from "@/lib/prisma";

export function listDocumentCategories() {
  return prisma.documentCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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

export function updateDocumentCategory(
  id: string,
  data: Partial<{ name: string; slug: string; description: string | null; sortOrder: number }>,
) {
  return prisma.documentCategory.update({ where: { id }, data });
}

export function deleteDocumentCategory(id: string) {
  return prisma.documentCategory.delete({ where: { id } });
}
