import "server-only";

import { prisma } from "@/lib/prisma";
import { cached, CACHE_TTL } from "@/lib/cache";

async function fetchDashboardData() {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [postCount, boardCount, userCount, commentCount, recentPosts, postDays, commentDays] =
    await prisma.$transaction([
      prisma.post.count(),
      prisma.board.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.comment.count(),
      prisma.post.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          category: true,
          isPinned: true,
          createdAt: true,
          board: { select: { key: true, name: true } },
          author: { select: { name: true } },
        },
      }),
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") as day, count(*)::bigint as count
        FROM posts WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") as day, count(*)::bigint as count
        FROM comments WHERE "createdAt" >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
    ]);

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const postMap = new Map(
    postDays.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]),
  );
  const commentMap = new Map(
    commentDays.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]),
  );

  const activityChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      day: dayLabels[d.getDay()] ?? `${d.getMonth() + 1}/${d.getDate()}`,
      posts: postMap.get(key) ?? 0,
      comments: commentMap.get(key) ?? 0,
    };
  });

  return { postCount, boardCount, userCount, commentCount, recentPosts, activityChart };
}

export async function getDashboardData() {
  return cached("dashboard:stats", CACHE_TTL.dashboard, fetchDashboardData);
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
