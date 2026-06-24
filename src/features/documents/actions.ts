"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  createDocumentCategory,
  deleteDocumentCategory,
  updateDocumentCategory,
} from "@/features/documents/category-service";

export async function addDocumentCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !slug) return { error: "이름과 슬러그를 입력하세요." };

  try {
    await createDocumentCategory({ name, slug, description });
    revalidatePath("/admin/document-categories");
    revalidatePath("/documents");
    return { ok: true };
  } catch {
    return { error: "카테고리 생성에 실패했습니다. (슬러그 중복 등)" };
  }
}

export async function updateDocumentCategoryAction(
  id: string,
  formData: FormData,
) {
  await requireRole(["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  await updateDocumentCategory(id, { name, description });
  revalidatePath("/admin/document-categories");
  revalidatePath("/documents");
}

export async function deleteDocumentCategoryAction(id: string) {
  await requireRole(["ADMIN"]);
  await deleteDocumentCategory(id);
  revalidatePath("/admin/document-categories");
  revalidatePath("/documents");
}
