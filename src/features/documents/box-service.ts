import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_POST_CATEGORIES,
} from "@/features/documents/constants";
import { ensureFrenchMaisonTree } from "@/features/documents/folder-seed";

export { ensureFrenchMaisonTree };

const boxInclude = {
  board: { select: { id: true, key: true, name: true, categories: true } },
  managers: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  },
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { documents: true, approvals: true, children: true } },
} as const;

export type DocumentBoxWithRelations = Awaited<
  ReturnType<typeof listDocumentBoxes>
>[number];

export type DocumentBoxTreeNode = DocumentBoxWithRelations & {
  children: DocumentBoxTreeNode[];
};

export function listDocumentBoxes(opts?: {
  activeOnly?: boolean;
  parentId?: string | null;
}) {
  return prisma.documentBox.findMany({
    where: {
      ...(opts?.activeOnly ? { isActive: true } : {}),
      ...(opts && "parentId" in opts ? { parentId: opts.parentId ?? null } : {}),
    },
    include: boxInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getDocumentBoxById(id: string) {
  return prisma.documentBox.findUnique({
    where: { id },
    include: boxInclude,
  });
}

export function getDocumentBoxBySlug(slug: string) {
  return prisma.documentBox.findUnique({
    where: { slug },
    include: {
      ...boxInclude,
      children: {
        where: { isActive: true },
        include: boxInclude,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

/** 루트부터 전체 트리 */
export async function getDocumentBoxTree(opts?: { activeOnly?: boolean }) {
  const all = await listDocumentBoxes({ activeOnly: opts?.activeOnly ?? true });
  const byParent = new Map<string | null, DocumentBoxWithRelations[]>();
  for (const box of all) {
    const key = box.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(box);
    byParent.set(key, list);
  }

  function build(parentId: string | null): DocumentBoxTreeNode[] {
    return (byParent.get(parentId) ?? []).map((box) => ({
      ...box,
      children: build(box.id),
    }));
  }

  return build(null);
}

export async function getFolderBreadcrumb(slug: string) {
  const chain: { id: string; name: string; slug: string }[] = [];
  let current = await prisma.documentBox.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parentId: true },
  });
  while (current) {
    chain.unshift({ id: current.id, name: current.name, slug: current.slug });
    if (!current.parentId) break;
    current = await prisma.documentBox.findUnique({
      where: { id: current.parentId },
      select: { id: true, name: true, slug: true, parentId: true },
    });
  }
  return chain;
}

export async function isDocumentBoxManager(userId: string): Promise<boolean> {
  const count = await prisma.documentBoxManager.count({ where: { userId } });
  return count > 0;
}

export async function isManagerOfDocumentBox(
  userId: string,
  documentBoxId: string,
): Promise<boolean> {
  const row = await prisma.documentBoxManager.findUnique({
    where: {
      documentBoxId_userId: { documentBoxId, userId },
    },
  });
  return Boolean(row);
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase().replace(/\s+/g, "-");
}

async function ensureBoardForFolder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  data: { slug: string; name: string; description?: string | null },
) {
  const boardKey = `doc-${data.slug}`;
  return tx.board.upsert({
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

/** 문서함 폴더 생성 — 하위 게시판을 함께 만든다 */
export async function createDocumentBox(data: {
  name: string;
  slug: string;
  description?: string | null;
  retentionDays?: number | null;
  classification?: string | null;
  classificationCode?: string | null;
  managerIds?: string[];
  parentId?: string | null;
  existingBoardKey?: string;
}) {
  const slug = normalizeSlug(data.slug);
  const siblings = await prisma.documentBox.count({
    where: { parentId: data.parentId ?? null },
  });

  return prisma.$transaction(async (tx) => {
    let boardId: string;

    if (data.existingBoardKey) {
      const existing = await tx.board.findUnique({
        where: { key: data.existingBoardKey },
      });
      if (!existing) throw new Error("게시판을 찾을 수 없습니다.");
      boardId = existing.id;
      await tx.board.update({
        where: { id: boardId },
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || existing.description,
          categories: [...DOCUMENT_POST_CATEGORIES],
          writeRoles: [],
        },
      });
    } else {
      const board = await ensureBoardForFolder(tx, {
        slug,
        name: data.name,
        description: data.description,
      });
      boardId = board.id;
    }

    return tx.documentBox.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        retentionDays: data.retentionDays ?? null,
        classification: data.classification?.trim() || null,
        classificationCode: data.classificationCode?.trim() || null,
        sortOrder: siblings,
        parentId: data.parentId ?? null,
        boardId,
        managers: data.managerIds?.length
          ? { create: data.managerIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: boxInclude,
    });
  });
}

export async function updateDocumentBox(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    retentionDays: number | null;
    classification: string | null;
    classificationCode: string | null;
    sortOrder: number;
    isActive: boolean;
    parentId: string | null;
    managerIds: string[];
  }>,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.documentBox.findUnique({
      where: { id },
      select: { boardId: true },
    });
    if (!existing) throw new Error("문서함을 찾을 수 없습니다.");

    if (data.managerIds) {
      await tx.documentBoxManager.deleteMany({ where: { documentBoxId: id } });
      if (data.managerIds.length > 0) {
        await tx.documentBoxManager.createMany({
          data: data.managerIds.map((userId) => ({
            documentBoxId: id,
            userId,
          })),
        });
      }
    }

    const box = await tx.documentBox.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description:
          data.description === undefined
            ? undefined
            : data.description?.trim() || null,
        retentionDays: data.retentionDays,
        classification:
          data.classification === undefined
            ? undefined
            : data.classification?.trim() || null,
        classificationCode:
          data.classificationCode === undefined
            ? undefined
            : data.classificationCode?.trim() || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        parentId: data.parentId === undefined ? undefined : data.parentId,
      },
      include: boxInclude,
    });

    if (existing.boardId && data.name) {
      await tx.board.update({
        where: { id: existing.boardId },
        data: {
          name: data.name.trim(),
          description:
            data.description === undefined
              ? undefined
              : data.description?.trim() || null,
        },
      });
    }

    return box;
  });
}

export async function deleteDocumentBox(id: string) {
  return prisma.$transaction(async (tx) => {
    const box = await tx.documentBox.findUnique({
      where: { id },
      select: { boardId: true, board: { select: { key: true } }, _count: { select: { children: true } } },
    });
    if (!box) throw new Error("문서함을 찾을 수 없습니다.");
    if (box._count.children > 0) {
      throw new Error("하위 폴더가 있어 삭제할 수 없습니다. 하위 폴더를 먼저 삭제하세요.");
    }

    await tx.approvalDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    });
    await tx.sharedDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    });

    await tx.documentBox.delete({ where: { id } });

    if (box.boardId && box.board?.key.startsWith("doc-")) {
      await tx.board.delete({ where: { id: box.boardId } }).catch(() => undefined);
    }
  });
}

/** @deprecated use ensureFrenchMaisonTree */
export async function ensureDefaultDocumentBoxes() {
  return ensureFrenchMaisonTree();
}

/** 전자결재 보관 대상 — 하위 게시판이 연결된 활성 문서함만 */
export function listDocumentCategories() {
  return prisma.documentBox.findMany({
    where: { isActive: true, boardId: { not: null } },
    include: boxInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
