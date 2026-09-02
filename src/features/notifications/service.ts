import "server-only";

import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}

export async function notifyUsers(
  userIds: string[],
  data: Omit<Parameters<typeof createNotification>[0], "userId">,
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ ...data, userId })),
  });
}

export async function listNotifications(
  userId: string,
  limit = 20,
  opts?: { unreadOnly?: boolean },
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
