import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";
import { demoContentWhere } from "@/lib/production/demo-filter";
import {
  resolvePeriodRange,
  type BoardPeriodPreset,
} from "@/features/board/board-search-utils";

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
  period?: BoardPeriodPreset;
  author?: string;
  hasAttachment?: boolean;
  minViewCount?: number;
  page?: number;
  pageSize?: number;
  /** 아나바다 그리드용 확장 필드 */
  withAnabadaFields?: boolean;
  /** 카드 레이아웃용 첫 첨부 미리보기 */
  withCardPreview?: boolean;
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
  let from = params.from;
  let to = params.to;
  if (params.period && params.period !== "all") {
    const range = resolvePeriodRange(params.period);
    from = range.from ?? from;
    to = range.to ?? to;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  if (params.author?.trim()) {
    where.author = {
      name: { contains: params.author.trim(), mode: "insensitive" },
    };
  }
  if (params.hasAttachment) {
    where.attachments = { some: {} };
  }
  if (params.minViewCount != null && params.minViewCount > 0) {
    where.viewCount = { gte: params.minViewCount };
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
        ...(params.withAnabadaFields || params.withCardPreview
          ? {
              attachments: {
                take: 1,
                orderBy: { createdAt: "asc" as const },
                select: { id: true, mimeType: true },
              },
            }
          : {}),
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

export interface RelatedPostItem {
  id: string;
  title: string;
  category: string | null;
  viewCount: number;
  createdAt: Date;
  authorName: string;
}

/** 같은 게시판·카테고리 기준 관련 게시물 */
export async function getRelatedPosts(
  boardId: string,
  postId: string,
  category: string | null,
  limit = 5,
): Promise<RelatedPostItem[]> {
  const rows = await prisma.post.findMany({
    where: {
      boardId,
      id: { not: postId },
      ...(category ? { category } : {}),
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      viewCount: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    viewCount: r.viewCount,
    createdAt: r.createdAt,
    authorName: r.author.name,
  }));
}
