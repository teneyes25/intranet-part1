"use server";

import { revalidatePath } from "next/cache";

import { canAccessBoard } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePost } from "@/features/board/permissions";
import { getBoardByKey } from "@/features/board/queries";
import { assignLabelsAction, movePostsAction } from "@/features/board-mailbox/actions";
import { removePost } from "@/lib/ai/ingest";

async function assertBoard(boardKey: string) {
  const user = await requireUser();
  const board = await getBoardByKey(boardKey);
  if (!board || !canAccessBoard(user.role, boardKey)) {
    throw new Error("게시판 접근 권한이 없습니다.");
  }
  return { user, board };
}

function revalidateBoard(boardKey: string) {
  revalidatePath(`/boards/${boardKey}`);
  revalidatePath(`/boards/${boardKey}/mailbox`);
}

export async function bulkDeletePostsListAction(boardKey: string, postIds: string[]) {
  const { user, board } = await assertBoard(boardKey);
  if (postIds.length === 0) return { error: "선택된 게시글이 없습니다." };

  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, boardId: board.id },
    select: { id: true, authorId: true },
  });

  const deletable = posts.filter((p) => canManagePost(user, p.authorId)).map((p) => p.id);
  if (deletable.length === 0) {
    return { error: "삭제 권한이 있는 게시글이 없습니다." };
  }

  await prisma.post.deleteMany({ where: { id: { in: deletable } } });
  for (const id of deletable) void removePost(id).catch(() => {});

  revalidateBoard(boardKey);
  return { ok: true, deleted: deletable.length };
}

export async function bulkUpdateCategoryAction(
  boardKey: string,
  postIds: string[],
  category: string,
) {
  const { user, board } = await assertBoard(boardKey);
  if (postIds.length === 0) return { error: "선택된 게시글이 없습니다." };

  const cat = category.trim();
  if (cat && !board.categories.includes(cat)) {
    const productCat = await prisma.productCategory.findFirst({
      where: { boardKey, name: cat },
    });
    if (!productCat && boardKey !== "anabada") {
      return { error: "유효하지 않은 카테고리입니다." };
    }
  }

  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, boardId: board.id },
    select: { id: true, authorId: true },
  });
  const allowed = posts.filter((p) => canManagePost(user, p.authorId)).map((p) => p.id);
  if (allowed.length === 0) return { error: "수정 권한이 있는 게시글이 없습니다." };

  await prisma.post.updateMany({
    where: { id: { in: allowed } },
    data: { category: cat || null },
  });

  revalidateBoard(boardKey);
  return { ok: true, updated: allowed.length };
}

export async function bulkMoveBoardAction(
  sourceBoardKey: string,
  postIds: string[],
  targetBoardKey: string,
) {
  const { user } = await assertBoard(sourceBoardKey);
  const target = await getBoardByKey(targetBoardKey);
  if (!target || !canAccessBoard(user.role, targetBoardKey)) {
    return { error: "대상 게시판에 접근할 수 없습니다." };
  }
  if (sourceBoardKey === targetBoardKey) {
    return { error: "같은 게시판으로는 이동할 수 없습니다." };
  }
  if (user.role !== "ADMIN" && user.role !== "HEADQUARTER") {
    return { error: "게시판 간 이동은 본사·관리자만 가능합니다." };
  }

  const source = await getBoardByKey(sourceBoardKey);
  if (!source) return { error: "게시판을 찾을 수 없습니다." };

  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, boardId: source.id },
    select: { id: true, authorId: true, category: true },
  });

  await prisma.$transaction(
    posts.map((p) =>
      prisma.post.update({
        where: { id: p.id },
        data: {
          boardId: target.id,
          category:
            p.category && target.categories.includes(p.category) ? p.category : null,
          price: targetBoardKey === "anabada" ? undefined : null,
          saleStatus: targetBoardKey === "anabada" ? undefined : null,
        },
      }),
    ),
  );

  revalidateBoard(sourceBoardKey);
  revalidateBoard(targetBoardKey);
  return { ok: true, moved: posts.length };
}

export async function bulkMoveToFolderAction(
  boardKey: string,
  postIds: string[],
  target:
    | { type: "inbox" }
    | { type: "important" }
    | { type: "trash" }
    | { type: "folder"; folderId: string },
) {
  return movePostsAction(boardKey, postIds, target);
}

export async function bulkAssignLabelsListAction(
  boardKey: string,
  postIds: string[],
  labelIds: string[],
) {
  return assignLabelsAction(boardKey, postIds, labelIds, "add");
}
