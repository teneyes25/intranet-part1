import type { PostLabel, PostFolder } from "@prisma/client";

export interface MailItemState {
  isImportant: boolean;
  isDraft: boolean;
  trashedAt: Date | null;
  folderId: string | null;
  labelIds: string[];
}

export interface MailboxPostRow {
  id: string;
  title: string;
  category: string | null;
  isPinned: boolean;
  viewCount: number;
  createdAt: Date;
  author: { id: string; name: string };
  _count: { comments: number; attachments: number };
  mail: MailItemState | null;
}

export interface MailboxCounts {
  inbox: number;
  important: number;
  draft: number;
  trash: number;
  folders: Record<string, number>;
}

export type CustomFolder = Pick<
  PostFolder,
  "id" | "name" | "slug" | "color" | "sortOrder"
>;

export type UserLabel = Pick<
  PostLabel,
  "id" | "name" | "color" | "sortOrder"
>;
