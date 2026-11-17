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
  /** 이미 있는 보드면 이름/설명을 덮어쓰지 않음 (관리자 수정 유지) */
  preserveLabels?: boolean;
}) {
  const boardKey = `doc-${data.slug}`;
  const existing = await prisma.board.findUnique({ where: { key: boardKey } });
  if (existing) {
    return prisma.board.update({
      where: { id: existing.id },
      data: {
        ...(data.preserveLabels
          ? {}
          : {
              name: data.name.trim(),
              description: data.description?.trim() || null,
            }),
        categories: [...DOCUMENT_POST_CATEGORIES],
        writeRoles: [],
      },
    });
  }

  return prisma.board.create({
    data: {
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
  const existing = await prisma.documentBox.findUnique({ where: { slug } });

  const board = await ensureBoardForFolder({
    slug,
    name: existing?.name ?? node.name,
    description: existing?.description ?? node.description,
    preserveLabels: Boolean(existing),
  });

  if (existing) {
    // 관리자가 바꾼 이름·설명·분류·보존·부모는 유지. 구조만 보정.
    await prisma.documentBox.update({
      where: { id: existing.id },
      data: {
        boardId: existing.boardId ?? board.id,
        isActive: true,
        // 부모가 아직 없으면 시드 부모로만 채움 (관리자 이동 보존)
        ...(existing.parentId == null && parentId != null
          ? { parentId }
          : {}),
        // sortOrder가 0이고 시드와 다를 때만 초기값 보정은 하지 않음 — 관리자 정렬 유지
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

/** 프렌치메종 기본 폴더 트리 보장 (seed / 런타임 공용). 기존 폴더의 관리자 수정값은 덮어쓰지 않음. */
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
