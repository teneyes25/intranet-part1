"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { markNotificationRead } from "@/features/notifications/service";

export async function markNotificationReadAction(id: string) {
  const user = await requireUser();
  await markNotificationRead(id, user.id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}
