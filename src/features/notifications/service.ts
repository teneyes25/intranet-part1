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
  const created = await prisma.notification.create({ data });

  void import("@/lib/firebase/firestore-server").then(({ syncNotificationToFirestore, sendPushToUser }) => {
    syncNotificationToFirestore(data.userId, {
      id: created.id,
      type: created.type,
      title: created.title,
      body: created.body,
      link: created.link,
      read: created.read,
      createdAt: created.createdAt,
    }).catch((e) => console.error("[firebase] notification sync:", e));

    sendPushToUser(data.userId, {
      title: created.title,
      body: created.body ?? undefined,
      link: created.link ?? undefined,
    }).catch((e) => console.error("[firebase] push:", e));
  });

  return created;
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

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
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
