"use server";

import { revalidatePath } from "next/cache";

import { requireRole, requireUser } from "@/lib/auth/session";
import { listJobCategories } from "@/features/jobs/service";
import {
  clearPresence,
  getMyProfile,
  getOrCreateDm,
  listAdminLogs,
  listDirectory,
  listMessages,
  listMyRooms,
  saveMyProfile,
  sendMessage,
  touchPresence,
  writeMessengerLog,
} from "@/features/messenger/service";

function parseDate(raw: string): Date | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

export async function pingMessengerPresenceAction() {
  const user = await requireUser();
  await touchPresence(user.id);
  return { ok: true as const };
}

export async function logoutMessengerPresenceAction() {
  const user = await requireUser();
  await clearPresence(user.id);
  await writeMessengerLog({
    action: "logout",
    actorId: user.id,
    detail: user.email,
  });
  return { ok: true as const };
}

export async function refreshMessengerStateAction() {
  const user = await requireUser();
  await touchPresence(user.id);
  const [directory, rooms] = await Promise.all([
    listDirectory(user.id),
    listMyRooms(user.id),
  ]);
  return { ok: true as const, directory, rooms };
}

export async function saveMessengerProfileAction(formData: FormData) {
  const user = await requireUser();
  const workplace = String(formData.get("workplace") ?? "");
  const title = String(formData.get("title") ?? "");
  const rank = String(formData.get("rank") ?? "");
  const hiredAt = parseDate(String(formData.get("hiredAt") ?? "").trim());
  const jobIds = formData.getAll("jobIds").map(String).filter(Boolean);
  const photo = formData.get("photo");
  try {
    await saveMyProfile({
      userId: user.id,
      workplace,
      title,
      rank,
      hiredAt,
      jobIds,
      photo: photo instanceof File && photo.size > 0 ? photo : null,
    });
    revalidatePath("/messenger");
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "저장 실패" };
  }
}

export async function openDmAction(peerId: string) {
  const user = await requireUser();
  try {
    const room = await getOrCreateDm(user.id, peerId);
    revalidatePath("/messenger");
    return { ok: true as const, roomId: room.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "대화방을 열 수 없습니다." };
  }
}

export async function sendMessengerMessageAction(formData: FormData) {
  const user = await requireUser();
  const roomId = String(formData.get("roomId") ?? "");
  const body = String(formData.get("body") ?? "");
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  try {
    const msg = await sendMessage({ userId: user.id, roomId, body, files });
    revalidatePath("/messenger");
    return { ok: true as const, id: msg.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "전송 실패" };
  }
}

export async function loadMessengerBootstrap() {
  const user = await requireUser();
  await touchPresence(user.id);
  const [me, directory, rooms, jobs] = await Promise.all([
    getMyProfile(user.id),
    listDirectory(user.id),
    listMyRooms(user.id),
    listJobCategories(),
  ]);
  return { me, directory, rooms, jobs };
}

export async function loadRoomMessagesAction(roomId: string) {
  const user = await requireUser();
  try {
    const messages = await listMessages(user.id, roomId);
    return { ok: true as const, messages };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "불러오기 실패" };
  }
}

export async function loadAdminMessengerLogsAction() {
  await requireRole(["ADMIN"]);
  return listAdminLogs(300);
}
