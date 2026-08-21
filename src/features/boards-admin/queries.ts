import "server-only";

import { prisma } from "@/lib/prisma";

export function listBoardsAdmin() {
  return prisma.board.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          posts: true,
          postFolders: true,
          postLabels: true,
        },
      },
    },
  });
}

export function getBoardAdmin(key: string) {
  return prisma.board.findUnique({
    where: { key },
    include: {
      _count: {
        select: {
          posts: true,
          postFolders: true,
          postLabels: true,
        },
      },
    },
  });
}

export async function listBoardMailboxStats(boardId: string) {
  const [folders, labels, trashed] = await Promise.all([
    prisma.postFolder.findMany({
      where: { boardId },
      orderBy: [{ userId: "asc" }, { sortOrder: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { mailItems: true } },
      },
    }),
    prisma.postLabel.findMany({
      where: { boardId },
      orderBy: [{ userId: "asc" }, { sortOrder: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.postMailItem.count({
      where: { boardId, trashedAt: { not: null } },
    }),
  ]);
  return { folders, labels, trashed };
}

export type BoardAdminItem = Awaited<ReturnType<typeof listBoardsAdmin>>[number];
