import { NextResponse } from "next/server";
import { z } from "zod";

import { saveFcmToken } from "@/lib/firebase/firestore-server";
import { getFirebaseFeatureFlags } from "@/lib/firebase/config";
import { getSession } from "@/lib/auth/session";

const bodySchema = z.object({
  token: z.string().min(10),
  deviceLabel: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getFirebaseFeatureFlags().messaging) {
    return NextResponse.json({ ok: false, reason: "messaging_disabled" });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  await saveFcmToken(session.user.id, parsed.data.token, parsed.data.deviceLabel);
  return NextResponse.json({ ok: true });
}
