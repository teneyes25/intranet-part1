import "server-only";

import { prisma } from "@/lib/prisma";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

function buildTree(
  flat: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    sortOrder: number;
  }[],
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export async function getCategoryTree(boardKey = "products") {
  const flat = await prisma.productCategory.findMany({
    where: { boardKey },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, sortOrder: true },
  });
  return buildTree(flat);
}

export async function getCategoryBySlug(slug: string, boardKey = "products") {
  return prisma.productCategory.findFirst({
    where: { boardKey, slug },
  });
}

/** slug 또는 하위 slug 에 해당하는 category 문자열 목록 */
export async function resolveCategoryFilter(
  slug: string | undefined,
  boardKey = "products",
): Promise<string[] | undefined> {
  if (!slug) return undefined;
  const all = await prisma.productCategory.findMany({
    where: { boardKey },
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const target = all.find((c) => c.slug === slug);
  if (!target) return [slug];

  const names: string[] = [target.name];
  const collect = (parentId: string) => {
    for (const c of all) {
      if (c.parentId === parentId) {
        names.push(c.name);
        collect(c.id);
      }
    }
  };
  collect(target.id);
  return names;
}

export async function getDownloadStats(attachmentId: string) {
  const [total, recent] = await Promise.all([
    prisma.downloadLog.count({ where: { attachmentId } }),
    prisma.downloadLog.findMany({
      where: { attachmentId },
      orderBy: { downloadedAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
  ]);
  return { total, recent };
}

export async function getAttachmentVersions(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { uploadedBy: { select: { name: true } } },
      },
    },
  });
  return attachment;
}
