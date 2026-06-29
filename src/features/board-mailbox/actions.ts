"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessBoard } from "@/lib/auth/access";
import { getBoardByKey } from "@/features/board/queries";

import { slugifyFolderName } from "./mailbox-utils";
import { verifyPostsInBoard } from "./queries";

async function assertBoardAccess(boardKey: string) {
  const user = await requireUser();
  const board = await getBoardByKey(boardKey);
  if (!board || !canAccessBoard(user.role, boardKey)) {
    throw new Error("게시판 접근 권한이 없습니다.");
  }
  return { user, board };
}

async function upsertMailItems(
  userId: string,
  boardId: string,
  postIds: string[],
  data: {
    folderId?: string | null;
    isImportant?: boolean;
    isDraft?: boolean;
    trashedAt?: Date | null;
  },
) {
  for (const postId of postIds) {
    await prisma.postMailItem.upsert({
      where: { userId_postId: { userId, postId } },
      create: {
        userId,
        postId,
        boardId,
        folderId: data.folderId ?? null,
        isImportant: data.isImportant ?? false,
        isDraft: data.isDraft ?? false,
        trashedAt: data.trashedAt ?? null,
      },
      update: {
        ...(data.folderId !== undefined ? { folderId: data.folderId } : {}),
        ...(data.isImportant !== undefined ? { isImportant: data.isImportant } : {}),
        ...(data.isDraft !== undefined ? { isDraft: data.isDraft } : {}),
        ...(data.trashedAt !== undefined ? { trashedAt: data.trashedAt } : {}),
      },
    });
  }
}

function revalidateMailbox(boardKey: string) {
  revalidatePath(`/boards/${boardKey}/mailbox`);
  revalidatePath(`/boards/${boardKey}`);
}

export async function createPostFolderAction(boardKey: string, name: string) {
  const { user, board } = await assertBoardAccess(boardKey);
  const trimmed = name.trim();
  if (!trimmed) return { error: "폴더 이름을 입력하세요." };

  let slug = slugifyFolderName(trimmed);
  const exists = await prisma.postFolder.findUnique({
    where: { userId_boardId_slug: { userId: user.id, boardId: board.id, slug } },
  });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const maxOrder = await prisma.postFolder.aggregate({
    where: { userId: user.id, boardId: board.id },
    _max: { sortOrder: true },
  });

  await prisma.postFolder.create({
    data: {
      userId: user.id,
      boardId: board.id,
      name: trimmed,
      slug,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function deletePostFolderAction(boardKey: string, folderId: string) {
  const { user, board } = await assertBoardAccess(boardKey);
  const folder = await prisma.postFolder.findFirst({
    where: { id: folderId, userId: user.id, boardId: board.id },
  });
  if (!folder) return { error: "폴더를 찾을 수 없습니다." };

  await prisma.$transaction([
    prisma.postMailItem.updateMany({
      where: { folderId, userId: user.id },
      data: { folderId: null },
    }),
    prisma.postFolder.delete({ where: { id: folderId } }),
  ]);

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function createPostLabelAction(
  boardKey: string,
  name: string,
  color?: string,
) {
  const { user, board } = await assertBoardAccess(boardKey);
  const trimmed = name.trim();
  if (!trimmed) return { error: "라벨 이름을 입력하세요." };

  try {
    await prisma.postLabel.create({
      data: {
        userId: user.id,
        boardId: board.id,
        name: trimmed,
        color: color || "#3B82F6",
      },
    });
  } catch {
    return { error: "이미 같은 이름의 라벨이 있습니다." };
  }

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function deletePostLabelAction(boardKey: string, labelId: string) {
  const { user, board } = await assertBoardAccess(boardKey);
  await prisma.postLabel.deleteMany({
    where: { id: labelId, userId: user.id, boardId: board.id },
  });
  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function movePostsAction(
  boardKey: string,
  postIds: string[],
  target:
    | { type: "inbox" }
    | { type: "important" }
    | { type: "draft" }
    | { type: "trash" }
    | { type: "folder"; folderId: string },
) {
  const { user, board } = await assertBoardAccess(boardKey);
  if (postIds.length === 0) return { error: "선택된 게시글이 없습니다." };
  if (!(await verifyPostsInBoard(postIds, board.id))) {
    return { error: "잘못된 게시글입니다." };
  }

  switch (target.type) {
    case "inbox":
      await upsertMailItems(user.id, board.id, postIds, {
        folderId: null,
        isDraft: false,
        trashedAt: null,
      });
      break;
    case "important":
      await upsertMailItems(user.id, board.id, postIds, {
        isImportant: true,
        trashedAt: null,
      });
      break;
    case "draft":
      await upsertMailItems(user.id, board.id, postIds, {
        isDraft: true,
        folderId: null,
        trashedAt: null,
      });
      break;
    case "trash":
      await upsertMailItems(user.id, board.id, postIds, {
        trashedAt: new Date(),
        folderId: null,
        isDraft: false,
      });
      break;
    case "folder":
      await upsertMailItems(user.id, board.id, postIds, {
        folderId: target.folderId,
        trashedAt: null,
        isDraft: false,
      });
      break;
  }

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function assignLabelsAction(
  boardKey: string,
  postIds: string[],
  labelIds: string[],
  mode: "add" | "set" = "add",
) {
  const { user, board } = await assertBoardAccess(boardKey);
  if (postIds.length === 0 || labelIds.length === 0) {
    return { error: "게시글과 라벨을 선택하세요." };
  }

  for (const postId of postIds) {
    const mailItem = await prisma.postMailItem.upsert({
      where: { userId_postId: { userId: user.id, postId } },
      create: { userId: user.id, postId, boardId: board.id },
      update: {},
    });

    if (mode === "set") {
      await prisma.postLabelAssignment.deleteMany({
        where: { mailItemId: mailItem.id },
      });
    }

    for (const labelId of labelIds) {
      await prisma.postLabelAssignment.upsert({
        where: {
          mailItemId_labelId: { mailItemId: mailItem.id, labelId },
        },
        create: { mailItemId: mailItem.id, labelId },
        update: {},
      });
    }
  }

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function bulkDeletePostsAction(boardKey: string, postIds: string[]) {
  const { user, board } = await assertBoardAccess(boardKey);
  if (postIds.length === 0) return { error: "선택된 게시글이 없습니다." };

  const mailItems = await prisma.postMailItem.findMany({
    where: {
      userId: user.id,
      postId: { in: postIds },
      boardId: board.id,
      trashedAt: { not: null },
    },
    select: { postId: true },
  });

  const trashedIds = mailItems.map((m) => m.postId);
  if (trashedIds.length === 0) {
    return { error: "휴지통에 있는 게시글만 영구 삭제할 수 있습니다." };
  }

  await prisma.post.deleteMany({
    where: { id: { in: trashedIds }, boardId: board.id },
  });

  revalidateMailbox(boardKey);
  return { ok: true, deleted: trashedIds.length };
}

export async function toggleImportantAction(boardKey: string, postId: string) {
  const { user, board } = await assertBoardAccess(boardKey);
  const existing = await prisma.postMailItem.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  await prisma.postMailItem.upsert({
    where: { userId_postId: { userId: user.id, postId } },
    create: {
      userId: user.id,
      postId,
      boardId: board.id,
      isImportant: true,
    },
    update: { isImportant: !existing?.isImportant },
  });

  revalidateMailbox(boardKey);
  return { ok: true };
}

export async function movePostDragAction(
  boardKey: string,
  postId: string,
  targetFolderId: string | null,
) {
  if (targetFolderId === "inbox") {
    return movePostsAction(boardKey, [postId], { type: "inbox" });
  }
  if (targetFolderId === "important") {
    return movePostsAction(boardKey, [postId], { type: "important" });
  }
  if (targetFolderId === "draft") {
    return movePostsAction(boardKey, [postId], { type: "draft" });
  }
  if (targetFolderId === "trash") {
    return movePostsAction(boardKey, [postId], { type: "trash" });
  }
  if (targetFolderId) {
    return movePostsAction(boardKey, [postId], {
      type: "folder",
      folderId: targetFolderId,
    });
  }
  return movePostsAction(boardKey, [postId], { type: "inbox" });
}
