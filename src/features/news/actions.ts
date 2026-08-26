"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  createNewsCategory,
  deleteNewsCategory,
  getNewsCategoryNames,
  updateNewsCategory,
} from "@/features/news/category-service";
import {
  createNewsKeyword,
  deleteNewsKeyword,
  updateNewsKeyword,
} from "@/features/news/keyword-service";

export async function addNewsKeywordAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const keyword = String(formData.get("keyword") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!keyword) return { error: "키워드를 입력하세요." };
  const cats = await getNewsCategoryNames();
  if (!cats.includes(category)) return { error: "카테고리를 선택하세요." };
  try {
    await createNewsKeyword({ keyword, category });
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "등록 실패" };
  }
}

export async function updateNewsKeywordAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  if (!id || !keyword) return { error: "입력값을 확인하세요." };
  const cats = await getNewsCategoryNames();
  if (!cats.includes(category)) return { error: "카테고리를 선택하세요." };
  try {
    await updateNewsKeyword(id, { keyword, category, isActive });
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장 실패" };
  }
}

export async function saveAllNewsKeywordsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const raw = String(formData.get("payload") ?? "[]");
  let rows: { id: string; keyword: string; category: string; isActive: boolean }[] = [];
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: "저장 데이터가 올바르지 않습니다." };
  }
  const cats = await getNewsCategoryNames();
  try {
    for (const row of rows) {
      if (!row.id || !row.keyword?.trim()) continue;
      if (!cats.includes(row.category)) continue;
      await updateNewsKeyword(row.id, {
        keyword: row.keyword.trim(),
        category: row.category,
        isActive: !!row.isActive,
      });
    }
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "일괄 저장 실패" };
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

export async function addNewsCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await createNewsCategory(String(formData.get("name") ?? ""));
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "추가 실패" };
  }
}

export async function updateNewsCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await updateNewsCategory(
      String(formData.get("id") ?? ""),
      String(formData.get("name") ?? ""),
    );
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteNewsCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await deleteNewsCategory(String(formData.get("id") ?? ""));
    revalidatePath("/admin/news-keywords");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "삭제 실패" };
  }
}

export async function triggerNewsCollectAction() {
  await requireRole(["ADMIN"]);
  const { runNewsCollectionJob } = await import("@/lib/news/job");
  const results = await runNewsCollectionJob("manual");
  revalidatePath("/boards/news");
  return { results };
}
