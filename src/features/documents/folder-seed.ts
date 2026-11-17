import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_POST_CATEGORIES,
  FRENCH_MAISON_TREE,
  ROOT_DOCUMENT_BOX_SLUG,
  type DocumentFolderSeed,
} from "@/features/documents/constants";

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/\s+/g, "-");
}

async function ensureBoardForFolder(data: {
  slug: string;
  name: string;
  description?: string | null;
}) {
  const boardKey = `doc-${data.slug}`;
  return prisma.board.upsert({
    where: { key: boardKey },
    update: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categories: [...DOCUMENT_POST_CATEGORIES],
      writeRoles: [],
    },
    create: {
      key: boardKey,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categories: [...DOCUMENT_POST_CATEGORIES],
      writeRoles: [],
      allowComments: true,
    },
  });
}

async function upsertFolderNode(
  node: DocumentFolderSeed,
  parentId: string | null,
  sortOrder: number,
): Promise<string> {
  const slug = normalizeSlug(node.slug);
  const board = await ensureBoardForFolder({
    slug,
    name: node.name,
    description: node.description,
  });

  const existing = await prisma.documentBox.findUnique({ where: { slug } });
  if (existing) {
    await prisma.documentBox.update({
      where: { id: existing.id },
      data: {
        name: node.name,
        description: node.description ?? null,
        parentId,
        sortOrder,
        boardId: board.id,
        isActive: true,
      },
    });
    return existing.id;
  }

  const created = await prisma.documentBox.create({
    data: {
      name: node.name,
      slug,
      description: node.description ?? null,
      parentId,
      sortOrder,
      boardId: board.id,
      isActive: true,
    },
  });
  return created.id;
}

async function seedTree(
  node: DocumentFolderSeed,
  parentId: string | null,
  sortOrder: number,
) {
  const id = await upsertFolderNode(node, parentId, sortOrder);
  for (const [i, child] of (node.children ?? []).entries()) {
    await seedTree(child, id, i);
  }
  return id;
}

/** 프렌치메종 기본 폴더 트리 보장 (seed / 런타임 공용) */
export async function ensureFrenchMaisonTree() {
  await seedTree(FRENCH_MAISON_TREE, null, 0);

  const legacySlugs = [
    "goals",
    "regulations",
    "market-trends",
    "pr",
    "products",
    "policy",
    "security",
    "operations",
    "approval",
  ];
  await prisma.documentBox.updateMany({
    where: {
      slug: { in: legacySlugs },
      parentId: null,
      NOT: { slug: ROOT_DOCUMENT_BOX_SLUG },
    },
    data: { isActive: false },
  });
}
