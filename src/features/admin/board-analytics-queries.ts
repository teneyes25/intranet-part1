import "server-only";

import { prisma } from "@/lib/prisma";

export interface BoardStatRow {
  boardKey: string;
  boardName: string;
  postCount: number;
  totalViews: number;
  avgViews: number;
  topKeywords: { word: string; count: number }[];
}

export interface DealerActivityRow {
  dealerId: string;
  dealerName: string;
  dealerCode: string;
  postCount: number;
  commentCount: number;
  lastActivityAt: Date | null;
}

function extractKeywords(titles: string[]): { word: string; count: number }[] {
  const freq = new Map<string, number>();
  const stop = new Set(["및", "의", "을", "를", "이", "가", "에", "에서", "으로", "the", "and"]);
  for (const title of titles) {
    for (const raw of title.split(/[\s,./[\]()\-]+/)) {
      const w = raw.trim();
      if (w.length < 2 || stop.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));
}

export async function getBoardStatistics(): Promise<BoardStatRow[]> {
  const boards = await prisma.board.findMany({
    orderBy: { name: "asc" },
    include: {
      posts: {
        select: { title: true, viewCount: true },
      },
    },
  });

  return boards.map((b) => {
    const postCount = b.posts.length;
    const totalViews = b.posts.reduce((s, p) => s + p.viewCount, 0);
    return {
      boardKey: b.key,
      boardName: b.name,
      postCount,
      totalViews,
      avgViews: postCount ? Math.round(totalViews / postCount) : 0,
      topKeywords: extractKeywords(b.posts.map((p) => p.title)),
    };
  });
}

export async function getDealerBoardActivity(limit = 20): Promise<DealerActivityRow[]> {
  const dealers = await prisma.dealer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      users: { select: { id: true } },
    },
    take: limit,
  });

  const rows: DealerActivityRow[] = [];

  for (const d of dealers) {
    const userIds = d.users.map((u) => u.id);
    if (userIds.length === 0) {
      rows.push({
        dealerId: d.id,
        dealerName: d.name,
        dealerCode: d.code,
        postCount: 0,
        commentCount: 0,
        lastActivityAt: null,
      });
      continue;
    }

    const [postCount, commentCount, lastPost, lastComment] = await Promise.all([
      prisma.post.count({ where: { authorId: { in: userIds } } }),
      prisma.comment.count({ where: { authorId: { in: userIds } } }),
      prisma.post.findFirst({
        where: { authorId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.comment.findFirst({
        where: { authorId: { in: userIds } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const dates = [lastPost?.createdAt, lastComment?.createdAt].filter(Boolean) as Date[];
    const lastActivityAt =
      dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

    rows.push({
      dealerId: d.id,
      dealerName: d.name,
      dealerCode: d.code,
      postCount,
      commentCount,
      lastActivityAt,
    });
  }

  return rows.sort((a, b) => b.postCount - a.postCount);
}
