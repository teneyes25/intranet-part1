"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  createDocumentBox,
  deleteDocumentBox,
  isDocumentBoxManager,
  isManagerOfDocumentBox,
  updateDocumentBox,
} from "@/features/documents/box-service";
import {
  canAssignDocumentBoxManagers,
  canManageDocumentBox,
  canManageDocumentBoxes,
} from "@/features/documents/permissions";

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function parseManagerIds(formData: FormData): string[] {
  return formData
    .getAll("managerIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

async function assertCanManageBoxes(userId: string, role: "ADMIN" | "HEADQUARTER" | "DEALER") {
  const designated = await isDocumentBoxManager(userId);
  if (!canManageDocumentBoxes({ role, isDesignatedManager: designated })) {
    throw new Error("문서함을 관리할 권한이 없습니다.");
  }
  return designated;
}

export async function addDocumentBoxAction(formData: FormData) {
  const user = await requireUser();
  await assertCanManageBoxes(user.id, user.role);

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const classification = String(formData.get("classification") ?? "").trim();
  const classificationCode = String(formData.get("classificationCode") ?? "").trim();
  const retentionDays = parseOptionalInt(formData.get("retentionDays"));
  const managerIds = canAssignDocumentBoxManagers(user.role)
    ? parseManagerIds(formData)
    : [];

  if (!name || !slug) return { error: "이름과 슬러그를 입력하세요." };

  try {
    await createDocumentBox({
      name,
      slug,
      description,
      classification,
      classificationCode,
      retentionDays,
      managerIds,
    });
    revalidatePath("/admin/document-categories");
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) {
    console.error("[documents] create failed:", e);
    return { error: "문서함 생성에 실패했습니다. (슬러그 중복 등)" };
  }
}

/** @deprecated alias */
export const addDocumentCategoryAction = addDocumentBoxAction;

export async function updateDocumentBoxAction(id: string, formData: FormData) {
  const user = await requireUser();
  const designated = await assertCanManageBoxes(user.id, user.role);
  const isManagerOfBox = await isManagerOfDocumentBox(user.id, id);

  if (
    !canManageDocumentBox({
      role: user.role,
      isManagerOfBox,
      isDesignatedManager: designated,
    })
  ) {
    return { error: "이 문서함을 수정할 권한이 없습니다." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const classification = String(formData.get("classification") ?? "").trim() || null;
  const classificationCode =
    String(formData.get("classificationCode") ?? "").trim() || null;
  const retentionDays = parseOptionalInt(formData.get("retentionDays"));
  const isActive = String(formData.get("isActive") ?? "true") !== "false";

  const patch: Parameters<typeof updateDocumentBox>[1] = {
    name: name || undefined,
    description,
    classification,
    classificationCode,
    retentionDays,
    isActive,
  };

  if (canAssignDocumentBoxManagers(user.role)) {
    patch.managerIds = parseManagerIds(formData);
  }

  try {
    await updateDocumentBox(id, patch);
    revalidatePath("/admin/document-categories");
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) {
    console.error("[documents] update failed:", e);
    return { error: "문서함 수정에 실패했습니다." };
  }
}

export async function deleteDocumentBoxAction(id: string) {
  const user = await requireUser();
  const designated = await assertCanManageBoxes(user.id, user.role);
  const isManagerOfBox = await isManagerOfDocumentBox(user.id, id);

  if (
    !canManageDocumentBox({
      role: user.role,
      isManagerOfBox,
      isDesignatedManager: designated,
    })
  ) {
    return { error: "이 문서함을 삭제할 권한이 없습니다." };
  }

  try {
    await deleteDocumentBox(id);
    revalidatePath("/admin/document-categories");
    revalidatePath("/documents");
    return { ok: true };
  } catch (e) {
    console.error("[documents] delete failed:", e);
    return { error: "문서함 삭제에 실패했습니다." };
  }
}

/** @deprecated alias */
export const deleteDocumentCategoryAction = deleteDocumentBoxAction;
export const updateDocumentCategoryAction = updateDocumentBoxAction;
