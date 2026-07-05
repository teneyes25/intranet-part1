import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAccessBoard } from "@/lib/auth/access";
import type { Role } from "@/lib/auth/roles";
import { fullTextSearchPosts } from "@/lib/search/fulltext";
import { sharedDocumentDealerWhere, userSearchDealerWhere } from "./scope";

export interface QuickSearchResult {
  id: string;
  title: string;
  type: "post" | "document" | "user";
  href: string;
  snippet: string;
}

export interface QuickSearchParams {
  q: string;
  role: Role;
  userId: string;
  dealerId?: string | null;
  perType?: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchPostsQuick(
  q: string,
  role: Role,
  limit: number,
): Promise<QuickSearchResult[]> {
  const boards = await prisma.board.findMany({
    select: { id: true, key: true, name: true },
  });
  const accessible = boards.filter((b) => canAccessBoard(role, b.key));
  if (accessible.length === 0) return [];

  const fts = await fullTextSearchPosts(
    q,
    accessible.map((b) => b.id),
    limit,
  );
  if (fts.length > 0) {
    return fts.map((p) => ({
      id: p.id,
      title: p.title,
      type: "post" as const,
      href: `/boards/${p.boardKey}/${p.id}`,
      snippet: stripHtml(p.content).slice(0, 120),
    }));
  }

  const posts = await prisma.post.findMany({
    where: {
      boardId: { in: accessible.map((b) => b.id) },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      board: { select: { key: true, name: true } },
    },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    type: "post" as const,
    href: `/boards/${p.board.key}/${p.id}`,
    snippet: `${p.board.name} · ${stripHtml(p.content).slice(0, 100)}`,
  }));
}

async function searchDocumentsQuick(
  q: string,
  role: Role,
  dealerId: string | null | undefined,
  limit: number,
): Promise<QuickSearchResult[]> {
  const dealerFilter = sharedDocumentDealerWhere(role, dealerId);
  const textFilter: Prisma.SharedDocumentWhereInput = {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ],
  };

  const where: Prisma.SharedDocumentWhereInput = dealerFilter
    ? { AND: [dealerFilter, textFilter] }
    : textFilter;

  const docs = await prisma.sharedDocument.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    type: "document" as const,
    href:
      d.url ??
      (d.boardKey && d.postId ? `/boards/${d.boardKey}/${d.postId}` : "/documents"),
    snippet: (d.description ?? d.category ?? "문서함").slice(0, 120),
  }));
}

async function searchUsersQuick(
  q: string,
  role: Role,
  dealerId: string | null | undefined,
  limit: number,
): Promise<QuickSearchResult[]> {
  const dealerFilter = userSearchDealerWhere(role, dealerId);
  const textFilter: Prisma.UserWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  };

  const where: Prisma.UserWhereInput = dealerFilter
    ? { AND: [dealerFilter, textFilter] }
    : textFilter;

  const users = await prisma.user.findMany({
    where,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      dealer: { select: { name: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    title: u.name,
    type: "user" as const,
    href: `/admin/users?q=${encodeURIComponent(u.email)}`,
    snippet: [u.email, u.dealer?.name].filter(Boolean).join(" · "),
  }));
}

/** Command Palette / Quick Search — Posts + Documents + Users (각 최대 5건) */
export async function quickSearch(params: QuickSearchParams): Promise<QuickSearchResult[]> {
  const q = params.q.trim();
  if (q.length < 2) return [];

  const perType = params.perType ?? 5;
  const [posts, documents, users] = await Promise.all([
    searchPostsQuick(q, params.role, perType),
    searchDocumentsQuick(q, params.role, params.dealerId, perType),
    searchUsersQuick(q, params.role, params.dealerId, perType),
  ]);

  return [...posts, ...documents, ...users];
}
