"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import {
  createJobCategory,
  deleteJobCategory,
  setUserJobs,
  updateJobCategory,
} from "@/features/jobs/service";

export async function addJobCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await createJobCategory(String(formData.get("name") ?? ""));
    revalidatePath("/admin/users");
    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "추가 실패" };
  }
}

export async function updateJobCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await updateJobCategory(
      String(formData.get("id") ?? ""),
      String(formData.get("name") ?? ""),
    );
    revalidatePath("/admin/users");
    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "수정 실패" };
  }
}

export async function deleteJobCategoryAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  try {
    await deleteJobCategory(String(formData.get("id") ?? ""));
    revalidatePath("/admin/users");
    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "삭제 실패" };
  }
}

export async function updateUserJobsAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "사용자 ID가 필요합니다." };
  const jobIds = formData.getAll("jobIds").map(String).filter(Boolean);
  await setUserJobs(userId, jobIds);
  revalidatePath("/admin/users");
  revalidatePath("/leave");
  return { ok: true };
}
