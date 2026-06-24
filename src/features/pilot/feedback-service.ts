import "server-only";

import { prisma } from "@/lib/prisma";

export async function createFeedback(data: {
  userId: string;
  category: string;
  rating: number;
  message: string;
  pageUrl?: string;
}) {
  return prisma.pilotFeedback.create({
    data: {
      userId: data.userId,
      category: data.category,
      rating: Math.min(5, Math.max(1, data.rating)),
      message: data.message,
      pageUrl: data.pageUrl,
    },
  });
}

export async function listFeedbacks(limit = 50) {
  return prisma.pilotFeedback.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getFeedbackStats() {
  const [total, avg] = await Promise.all([
    prisma.pilotFeedback.count(),
    prisma.pilotFeedback.aggregate({ _avg: { rating: true } }),
  ]);
  return { total, avgRating: avg._avg.rating ?? 0 };
}
