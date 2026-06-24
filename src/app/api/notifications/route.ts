import { NextResponse } from "next/server";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/service";
import { withApiGuard } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiGuard({ tier: "api" }, async (_req, { session }) => {
  const items = await listNotifications(session!.user.id, 30);
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ items, unread });
});

export const PATCH = withApiGuard({ tier: "api" }, async (req, { session }) => {
  const body = (await req.json()) as { id?: string; all?: boolean };
  if (body.all) {
    await markAllNotificationsRead(session!.user.id);
    return NextResponse.json({ ok: true });
  }
  if (body.id) {
    await markNotificationRead(body.id, session!.user.id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or all required" }, { status: 400 });
});
