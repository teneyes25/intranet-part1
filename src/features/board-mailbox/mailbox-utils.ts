import "server-only";

import type { Prisma } from "@prisma/client";

import type { Role } from "@/lib/auth/roles";
import { demoContentWhere } from "@/lib/production/demo-filter";

import type { MailItemState } from "./types";
import type { SystemFolderKey } from "./constants";

type MailRecord = {
  postId: string;
  folderId: string | null;
  isImportant: boolean;
  isDraft: boolean;
  trashedAt: Date | null;
  labelIds: string[];
};

export function slugifyFolderName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/g, "")
    .slice(0, 40);
  return base || `folder-${Date.now()}`;
}

export function matchesSystemFolder(
  mail: MailRecord | undefined,
  folder: SystemFolderKey,
  labelId?: string,
): boolean {
  if (labelId) {
    if (!mail || mail.trashedAt) return false;
    return mail.labelIds.includes(labelId);
  }

  switch (folder) {
    case "trash":
      return !!mail?.trashedAt;
    case "draft":
      return !!mail?.isDraft && !mail?.trashedAt;
    case "important":
      return !!mail?.isImportant && !mail?.trashedAt && !mail?.isDraft;
    case "inbox":
      if (mail?.trashedAt || mail?.isDraft) return false;
      if (mail?.folderId) return false;
      return true;
    default:
      return false;
  }
}

export function matchesCustomFolder(
  mail: MailRecord | undefined,
  folderId: string,
): boolean {
  return !!mail && mail.folderId === folderId && !mail.trashedAt && !mail.isDraft;
}

export function toMailState(
  mail: MailRecord | undefined,
): MailItemState | null {
  if (!mail) return null;
  return {
    isImportant: mail.isImportant,
    isDraft: mail.isDraft,
    trashedAt: mail.trashedAt,
    folderId: mail.folderId,
    labelIds: mail.labelIds,
  };
}

export function buildPostSearchWhere(q?: string): Prisma.PostWhereInput {
  if (!q?.trim()) return {};
  return {
    OR: [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { content: { contains: q.trim(), mode: "insensitive" } },
    ],
  };
}

export function buildBoardPostWhere(
  boardId: string,
  role: Role,
  q?: string,
): Prisma.PostWhereInput {
  return {
    boardId,
    ...demoContentWhere(role),
    ...buildPostSearchWhere(q),
  };
}
