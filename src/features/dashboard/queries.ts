import "server-only";

import { prisma } from "@/lib/prisma";
import { cached, CACHE_TTL } from "@/lib/cache";
import { canAccessBoard } from "@/lib/auth/access";
import type { Role } from "@/lib/auth/roles";
import { hasMinRole } from "@/lib/auth/roles";

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

export interface ActivityFeedItem {
  id: string;
  kind: "audit" | "notification" | "post";
  sentence: string;
  href: string | null;
  at: Date;
  actionKey?: string;
}

const AUDIT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "로그인했습니다",
  LOGIN_FAILURE: "로그인에 실패했습니다",
  APPROVAL_SUBMIT: "결재를 상신했습니다",
  APPROVAL_APPROVE: "결재를 승인했습니다",
  APPROVAL_REJECT: "결재를 반려했습니다",
  AI_CHAT: "AI에게 질문했습니다",
  AI_DRAFT: "AI 초안을 생성했습니다",
  FILE_UPLOAD: "파일을 업로드했습니다",
  PILOT_FEEDBACK: "Pilot 피드백을 남겼습니다",
};

function auditSentence(action: string, detail: string | null, resource: string | null): string {
  const base = AUDIT_LABELS[action] ?? "시스템 활동이 기록되었습니다";
  if (detail) return `${base} — ${detail.slice(0, 80)}`;
  if (resource) return `${base} (${resource.slice(0, 24)})`;
  return base;
}

function notificationSentence(title: string, body: string | null): string {
  return body ? `${title} — ${body.slice(0, 80)}` : title;
}

async function fetchRecentActivity(
  userId: string,
  role: Role,
  limit: number,
): Promise<ActivityFeedItem[]> {
  const auditWhere = hasMinRole(role, "HEADQUARTER")
    ? {}
    : { userId };

  const boards = await prisma.board.findMany({ select: { id: true, key: true } });
  const accessibleBoardIds = boards
    .filter((b) => canAccessBoard(role, b.key))
    .map((b) => b.id);

  const [audits, notifications, posts] = await Promise.all([
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      take: Math.ceil(limit / 2),
      select: {
        id: true,
        action: true,
        detail: true,
        resource: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.ceil(limit / 2),
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        createdAt: true,
      },
    }),
    accessibleBoardIds.length > 0
      ? prisma.post.findMany({
          where: { boardId: { in: accessibleBoardIds } },
          orderBy: { createdAt: "desc" },
          take: Math.ceil(limit / 2),
          select: {
            id: true,
            title: true,
            createdAt: true,
            board: { select: { key: true, name: true } },
            author: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const items: ActivityFeedItem[] = [
    ...audits.map((a) => ({
      id: `audit:${a.id}`,
      kind: "audit" as const,
      sentence: auditSentence(a.action, a.detail, a.resource),
      href: a.resource?.startsWith("/") ? a.resource : null,
      at: a.createdAt,
      actionKey: a.action,
    })),
    ...notifications.map((n) => ({
      id: `notif:${n.id}`,
      kind: "notification" as const,
      sentence: notificationSentence(n.title, n.body),
      href: n.link,
      at: n.createdAt,
    })),
    ...posts.map((p) => ({
      id: `post:${p.id}`,
      kind: "post" as const,
      sentence: `${p.author.name}님이 「${p.title}」을(를) ${p.board.name}에 게시했습니다`,
      href: `/boards/${p.board.key}/${p.id}`,
      at: p.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

export async function getRecentActivity(
  userId: string,
  role: Role,
  limit = 12,
): Promise<ActivityFeedItem[]> {
  return cached(
    `dashboard:activity:${userId}:${limit}`,
    60,
    () => fetchRecentActivity(userId, role, limit),
  );
}
