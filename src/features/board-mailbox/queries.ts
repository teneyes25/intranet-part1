import "server-only";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";

import { MAILBOX_PAGE_SIZE, SYSTEM_FOLDERS, type SystemFolderKey } from "./constants";
import {
  buildBoardPostWhere,
  matchesCustomFolder,
  matchesSystemFolder,
  toMailState,
} from "./mailbox-utils";
import type { CustomFolder, MailboxCounts, MailboxPostRow, UserLabel } from "./types";

async function loadMailMap(userId: string, boardId: string) {
  const rows = await prisma.postMailItem.findMany({
    where: { userId, boardId },
    include: { labels: { select: { labelId: true } } },
  });
  return new Map(
    rows.map((r) => [
      r.postId,
      {
        postId: r.postId,
        folderId: r.folderId,
        isImportant: r.isImportant,
        isDraft: r.isDraft,
        trashedAt: r.trashedAt,
        labelIds: r.labels.map((l) => l.labelId),
      },
    ]),
  );
}

function filterPostsByView(
  posts: Awaited<ReturnType<typeof fetchAllBoardPosts>>,
  mailMap: Awaited<ReturnType<typeof loadMailMap>>,
  view:
    | { type: "system"; key: SystemFolderKey }
    | { type: "folder"; id: string }
    | { type: "label"; id: string },
) {
  return posts.filter((post) => {
    const mail = mailMap.get(post.id);
    if (view.type === "folder") {
      return matchesCustomFolder(mail, view.id);
    }
    if (view.type === "label") {
      return matchesSystemFolder(mail, "inbox", view.id);
    }
    return matchesSystemFolder(mail, view.key);
  });
}

async function fetchAllBoardPosts(boardId: string, role: Role, q?: string) {
  return prisma.post.findMany({
    where: buildBoardPostWhere(boardId, role, q),
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { comments: true, attachments: true } },
    },
  });
}

export async function getCustomFolders(
  userId: string,
  boardId: string,
): Promise<CustomFolder[]> {
  return prisma.postFolder.findMany({
    where: { userId, boardId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true, color: true, sortOrder: true },
  });
}

export async function getUserLabels(
  userId: string,
  boardId: string,
): Promise<UserLabel[]> {
  return prisma.postLabel.findMany({
    where: { userId, boardId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, color: true, sortOrder: true },
  });
}

export async function getMailboxCounts(
  userId: string,
  boardId: string,
  role: Role,
): Promise<MailboxCounts> {
  const [posts, mailMap, folders] = await Promise.all([
    fetchAllBoardPosts(boardId, role),
    loadMailMap(userId, boardId),
    getCustomFolders(userId, boardId),
  ]);

  const counts: MailboxCounts = {
    inbox: 0,
    important: 0,
    draft: 0,
    trash: 0,
    folders: {},
  };

  for (const f of folders) counts.folders[f.id] = 0;

  for (const post of posts) {
    const mail = mailMap.get(post.id);
    if (matchesSystemFolder(mail, "inbox")) counts.inbox++;
    if (matchesSystemFolder(mail, "important")) counts.important++;
    if (matchesSystemFolder(mail, "draft")) counts.draft++;
    if (matchesSystemFolder(mail, "trash")) counts.trash++;
    for (const f of folders) {
      if (matchesCustomFolder(mail, f.id)) {
        counts.folders[f.id] = (counts.folders[f.id] ?? 0) + 1;
      }
    }
  }

  return counts;
}

export async function listMailboxPosts(params: {
  userId: string;
  boardId: string;
  role: Role;
  folder: string;
  labelId?: string;
  q?: string;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const [posts, mailMap] = await Promise.all([
    fetchAllBoardPosts(params.boardId, params.role, params.q),
    loadMailMap(params.userId, params.boardId),
  ]);

  let view:
    | { type: "system"; key: SystemFolderKey }
    | { type: "folder"; id: string }
    | { type: "label"; id: string };

  if (params.labelId) {
    view = { type: "label", id: params.labelId };
  } else if (SYSTEM_FOLDERS.some((f) => f.key === params.folder)) {
    view = { type: "system", key: params.folder as SystemFolderKey };
  } else {
    view = { type: "folder", id: params.folder };
  }

  const filtered = filterPostsByView(posts, mailMap, view);
  const total = filtered.length;
  const slice = filtered.slice((page - 1) * MAILBOX_PAGE_SIZE, page * MAILBOX_PAGE_SIZE);

  const items: MailboxPostRow[] = slice.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    isPinned: p.isPinned,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    author: p.author,
    _count: p._count,
    mail: toMailState(mailMap.get(p.id)),
  }));

  return {
    items,
    total,
    page,
    pageSize: MAILBOX_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / MAILBOX_PAGE_SIZE)),
  };
}

export async function verifyPostsInBoard(postIds: string[], boardId: string) {
  const count = await prisma.post.count({
    where: { id: { in: postIds }, boardId },
  });
  return count === postIds.length;
}
