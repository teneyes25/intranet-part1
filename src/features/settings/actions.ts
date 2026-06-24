"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/config";

export async function updateProfileAction(data: {
  name: string;
  bio?: string;
  locale?: Locale;
}) {
  const session = await getSession();
  if (!session?.user) return { error: "로그인이 필요합니다." };

  const name = data.name.trim();
  if (!name) return { error: "이름을 입력하세요." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      bio: data.bio?.trim() || null,
      locale: data.locale ?? "ko",
    },
    update: {
      bio: data.bio?.trim() || null,
      locale: data.locale ?? "ko",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
