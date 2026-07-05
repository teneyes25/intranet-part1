import "server-only";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth/roles";
import { demoContentWhere } from "@/lib/production/demo-filter";

export interface ScheduleEvent {
  id: string;
  title: string;
  category: string | null;
  eventStart: Date;
  eventEnd: Date | null;
  href: string;
}

export function parseMonthParam(month?: string): { year: number; month: number } {
  const now = new Date();
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = month.split("-").map(Number);
  return { year: y ?? now.getFullYear(), month: m ?? now.getMonth() + 1 };
}

export async function getScheduleEventsForMonth(
  boardId: string,
  year: number,
  month: number,
  boardKey: string,
  role?: Role,
): Promise<ScheduleEvent[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const posts = await prisma.post.findMany({
    where: {
      boardId,
      ...(role ? demoContentWhere(role) : {}),
      OR: [
        { eventStart: { gte: start, lte: end } },
        {
          eventStart: null,
          createdAt: { gte: start, lte: end },
        },
      ],
    },
    orderBy: [{ eventStart: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      category: true,
      eventStart: true,
      eventEnd: true,
      createdAt: true,
    },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    eventStart: p.eventStart ?? p.createdAt,
    eventEnd: p.eventEnd,
    href: `/boards/${boardKey}/${p.id}`,
  }));
}
