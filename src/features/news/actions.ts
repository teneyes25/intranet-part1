"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  createNewsKeyword,
  deleteNewsKeyword,
  updateNewsKeyword,
  NEWS_CATEGORIES,
} from "@/features/news/keyword-service";

export async function addNewsKeywordAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const keyword = String(formData.get("keyword") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!keyword) return { error: "키워드를 입력하세요." };
  if (!NEWS_CATEGORIES.includes(category as (typeof NEWS_CATEGORIES)[number])) {
    return { error: "카테고리를 선택하세요." };
  }

  try {
    await createNewsKeyword({ keyword, category });
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "등록 실패" };
  }
}

export async function toggleNewsKeywordAction(id: string, isActive: boolean) {
  await requireRole(["ADMIN"]);
  await updateNewsKeyword(id, { isActive });
  revalidatePath("/admin/news-keywords");
}

export async function deleteNewsKeywordAction(id: string) {
  await requireRole(["ADMIN"]);
  await deleteNewsKeyword(id);
  revalidatePath("/admin/news-keywords");
}

export async function triggerNewsCollectAction() {
  await requireRole(["ADMIN"]);
  const { runNewsCollectionJob } = await import("@/lib/news/job");
  const results = await runNewsCollectionJob("manual");
  revalidatePath("/boards/news");
  return { results };
}
