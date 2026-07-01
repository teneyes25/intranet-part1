import { NextResponse } from "next/server";
import { z } from "zod";

import {
  pageBuilderSessionId,
  savePageBuilderDraft,
  upsertPageBuilderPresence,
} from "@/lib/firebase/firestore-server";
import { getFirebaseFeatureFlags } from "@/lib/firebase/config";
import { getSession } from "@/lib/auth/session";

const presenceSchema = z.object({
  action: z.literal("presence"),
  slug: z.string(),
  dealerScope: z.string(),
});

const draftSchema = z.object({
  action: z.literal("draft"),
  slug: z.string(),
  dealerScope: z.string(),
  htmlPreview: z.string(),
  cssLength: z.number().int().nonnegative(),
});

const bodySchema = z.discriminatedUnion("action", [presenceSchema, draftSchema]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getFirebaseFeatureFlags().firestore) {
    return NextResponse.json({ ok: false, reason: "firestore_disabled" });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const sessionId = pageBuilderSessionId(parsed.data.slug, parsed.data.dealerScope);
  const userName = session.user.name ?? "사용자";

  if (parsed.data.action === "presence") {
    await upsertPageBuilderPresence({
      sessionId,
      userId: session.user.id,
      userName,
      slug: parsed.data.slug,
      dealerScope: parsed.data.dealerScope,
    });
  } else {
    await savePageBuilderDraft({
      sessionId,
      userId: session.user.id,
      userName,
      htmlPreview: parsed.data.htmlPreview,
      cssLength: parsed.data.cssLength,
    });
  }

  return NextResponse.json({ ok: true });
}
