import { NextResponse } from "next/server";

import { deactivateEmergencyNoticeAction } from "@/features/system/actions";
import { requireRole } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const { noticeId } = (await request.json()) as { noticeId?: string };
    if (!noticeId) {
      return NextResponse.json({ error: "noticeId required" }, { status: 400 });
    }
    await deactivateEmergencyNoticeAction(noticeId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
