import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_POST_CATEGORIES,
  DEFAULT_DOCUMENT_BOXES,
} from "@/features/documents/constants";

const boxInclude = {
  board: { select: { id: true, key: true, name: true, categories: true } },
  managers: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  },
  _count: { select: { documents: true, approvals: true } },
} as const;

export type DocumentBoxWithRelations = Awaited<
  ReturnType<typeof listDocumentBoxes>
>[number];

export function listDocumentBoxes(opts?: { activeOnly?: boolean }) {
  return prisma.documentBox.findMany({
    where: opts?.activeOnly ? { isActive: true } : undefined,
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
    include: boxInclude,
  });
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

/** 문서함 생성 — 하위 게시판을 함께 만든다 */
export async function createDocumentBox(data: {
  name: string;
  slug: string;
  description?: string | null;
  retentionDays?: number | null;
  classification?: string | null;
  classificationCode?: string | null;
  managerIds?: string[];
  /** 기존 게시판에 연결 (없으면 신규 생성) */
  existingBoardKey?: string;
}) {
  const slug = normalizeSlug(data.slug);
  const count = await prisma.documentBox.count();

  return prisma.$transaction(async (tx) => {
    let boardId: string;
    let boardKey: string;

    if (data.existingBoardKey) {
      const existing = await tx.board.findUnique({
        where: { key: data.existingBoardKey },
      });
      if (!existing) throw new Error("게시판을 찾을 수 없습니다.");
      boardId = existing.id;
      boardKey = existing.key;
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
      boardKey = `doc-${slug}`;
      const board = await tx.board.create({
        data: {
          key: boardKey,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          categories: [...DOCUMENT_POST_CATEGORIES],
          writeRoles: [],
          allowComments: true,
        },
      });
      boardId = board.id;
    }

    const box = await tx.documentBox.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        retentionDays: data.retentionDays ?? null,
        classification: data.classification?.trim() || null,
        classificationCode: data.classificationCode?.trim() || null,
        sortOrder: count,
        boardId,
        managers: data.managerIds?.length
          ? {
              create: data.managerIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: boxInclude,
    });

    return box;
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
      select: { boardId: true, board: { select: { key: true } } },
    });
    if (!box) throw new Error("문서함을 찾을 수 없습니다.");

    // 결재·공유문서 연결 해제
    await tx.approvalDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    });
    await tx.sharedDocument.updateMany({
      where: { documentCategoryId: id },
      data: { documentCategoryId: null },
    });

    await tx.documentBox.delete({ where: { id } });

    // 문서함 전용으로 생성된 게시판(doc-*)만 삭제. 기존 pr/products 등은 유지.
    if (box.boardId && box.board?.key.startsWith("doc-")) {
      await tx.board.delete({ where: { id: box.boardId } });
    } else if (box.boardId) {
      // 연결만 해제된 상태 — board 는 남김
    }
  });
}

/** 시드/마이그레이션용 — 기본 문서함·게시판 보장 */
export async function ensureDefaultDocumentBoxes() {
  for (const [i, def] of DEFAULT_DOCUMENT_BOXES.entries()) {
    const existingBox = await prisma.documentBox.findUnique({
      where: { slug: def.slug },
    });
    if (existingBox) {
      if (!existingBox.boardId) {
        const board = await prisma.board.upsert({
          where: { key: def.key },
          update: {
            name: def.name,
            description: def.description,
            categories: [...DOCUMENT_POST_CATEGORIES],
            writeRoles: [],
          },
          create: {
            key: def.key,
            name: def.name,
            description: def.description,
            categories: [...DOCUMENT_POST_CATEGORIES],
            writeRoles: [],
          },
        });
        await prisma.documentBox.update({
          where: { id: existingBox.id },
          data: {
            boardId: board.id,
            retentionDays: def.retentionDays,
            classification: def.classification,
            classificationCode: def.classificationCode,
            sortOrder: i,
          },
        });
      }
      continue;
    }

    const board = await prisma.board.upsert({
      where: { key: def.key },
      update: {
        name: def.name,
        description: def.description,
        categories: [...DOCUMENT_POST_CATEGORIES],
        writeRoles: [],
      },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        categories: [...DOCUMENT_POST_CATEGORIES],
        writeRoles: [],
      },
    });

    await prisma.documentBox.create({
      data: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        retentionDays: def.retentionDays,
        classification: def.classification,
        classificationCode: def.classificationCode,
        sortOrder: i,
        boardId: board.id,
      },
    });
  }
}

/** 전자결재 보관 대상 — 하위 게시판이 연결된 활성 문서함만 */
export function listDocumentCategories() {
  return prisma.documentBox.findMany({
    where: { isActive: true, boardId: { not: null } },
    include: boxInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
