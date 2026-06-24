import "server-only";

import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/features/notifications/service";
import { writeAudit } from "@/lib/audit/service";
import { Role } from "@prisma/client";

export async function trackUsage(data: {
  userId?: string | null;
  event: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.usageMetric.create({
      data: {
        userId: data.userId ?? null,
        event: data.event,
        resource: data.resource,
        metadata: data.metadata ? (data.metadata as object) : undefined,
      },
    });
  } catch {
    /* non-blocking */
  }
}

export async function reportSystemError(data: {
  source: string;
  message: string;
  stack?: string;
}) {
  const row = await prisma.systemErrorLog.create({
    data: {
      source: data.source.slice(0, 128),
      message: data.message.slice(0, 2000),
      stack: data.stack?.slice(0, 4000),
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true, email: true },
  });

  if (admins.length > 0) {
    await notifyUsers(
      admins.map((a) => a.id),
      {
        type: "SYSTEM",
        title: `[Pilot] 시스템 오류: ${data.source}`,
        body: data.message.slice(0, 200),
        link: "/admin/pilot",
      },
    );
    await prisma.systemErrorLog.update({
      where: { id: row.id },
      data: { notified: true },
    });
  }

  void writeAudit({
    action: "SYSTEM_ERROR",
    resource: data.source,
    detail: data.message.slice(0, 500),
    success: false,
  });

  return row.id;
}
