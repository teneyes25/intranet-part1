import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";
import { demoContentWhere } from "@/lib/production/demo-filter";

export const POSTS_PAGE_SIZE = 10;

export function getBoardByKey(key: string) {
  return prisma.board.findUnique({ where: { key } });
}

export function listBoards() {
  return prisma.board.findMany({ orderBy: { createdAt: "asc" } });
}

export interface ListPostsParams {
  boardId: string;
  role?: Role;
  q?: string;
  category?: string;
  /** 여러 카테고리(트리 하위 포함) */
  categories?: string[];
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listPosts(params: ListPostsParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? POSTS_PAGE_SIZE;

  const where: Prisma.PostWhereInput = {
    boardId: params.boardId,
    ...(params.role ? demoContentWhere(params.role) : {}),
  };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { content: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.categories?.length) {
    where.category = { in: params.categories };
  } else if (params.category) {
    where.category = params.category;
  }
  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = params.from;
    if (params.to) where.createdAt.lte = params.to;
  }

  const [items, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: page * pageSize < total,
  };
}

export type PostListResult = Awaited<ReturnType<typeof listPosts>>;
export type PostListItem = PostListResult["items"][number];

export function getPostDetail(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { select: { id: true, name: true, role: true } },
      board: true,
      attachments: { orderBy: { createdAt: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
}

export type PostDetail = NonNullable<
  Awaited<ReturnType<typeof getPostDetail>>
>;

export async function incrementViewCount(postId: string) {
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}
