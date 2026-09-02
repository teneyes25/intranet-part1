import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";
import { sanitizePlainText } from "@/lib/sanitize";
import { createNotification } from "@/features/notifications/service";
import {
  MESSENGER_MAX_FILE_SIZE,
  MESSENGER_MAX_FILES,
  MESSENGER_ONLINE_MS,
  MESSENGER_RETENTION_DAYS,
} from "@/features/messenger/constants";

export function isOnline(lastSeenAt: Date | null | undefined, now = new Date()) {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= MESSENGER_ONLINE_MS;
}

export async function touchPresence(userId: string) {
  await prisma.messengerProfile.upsert({
    where: { userId },
    create: { userId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}

/** 로그아웃 직후 다른 회원에게 오프라인으로 보이게 lastSeenAt 을 비웁니다. */
export async function clearPresence(userId: string) {
  await prisma.messengerProfile.updateMany({
    where: { userId },
    data: { lastSeenAt: null },
  });
}

export async function writeMessengerLog(params: {
  action: string;
  actorId?: string | null;
  targetUserId?: string | null;
  roomId?: string | null;
  messageId?: string | null;
  detail?: string | null;
}) {
  await prisma.messengerLog
    .create({
      data: {
        action: params.action,
        actorId: params.actorId ?? null,
        targetUserId: params.targetUserId ?? null,
        roomId: params.roomId ?? null,
        messageId: params.messageId ?? null,
        detail: params.detail?.slice(0, 2000) ?? null,
      },
    })
    .catch((e) => console.error("[messenger-log]", e));
}

export async function ensureProfile(userId: string) {
  return prisma.messengerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getMyProfile(userId: string) {
  await ensureProfile(userId);
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      jobs: { select: { jobCategory: { select: { id: true, name: true } } } },
      messengerProfile: true,
    },
  });
}

export async function saveMyProfile(params: {
  userId: string;
  workplace?: string | null;
  title?: string | null;
  rank?: string | null;
  hiredAt?: Date | null;
  jobIds?: string[];
  photo?: File | null;
}) {
  await ensureProfile(params.userId);
  let photoStorageKey: string | undefined;
  if (params.photo && params.photo.size > 0) {
    if (params.photo.size > MESSENGER_MAX_FILE_SIZE) {
      throw new Error("프로필 사진은 10MB 이하여야 합니다.");
    }
    const saved = await saveUploadedFile(params.photo, { userId: params.userId });
    photoStorageKey = saved.storageKey;
  }

  await prisma.messengerProfile.update({
    where: { userId: params.userId },
    data: {
      workplace: params.workplace?.trim() || null,
      title: params.title?.trim() || null,
      rank: params.rank?.trim() || null,
      hiredAt: params.hiredAt ?? null,
      ...(photoStorageKey ? { photoStorageKey } : {}),
    },
  });

  if (params.jobIds) {
    await prisma.userJob.deleteMany({ where: { userId: params.userId } });
    if (params.jobIds.length > 0) {
      await prisma.userJob.createMany({
        data: params.jobIds.map((jobCategoryId) => ({
          userId: params.userId,
          jobCategoryId,
        })),
        skipDuplicates: true,
      });
    }
  }

  await writeMessengerLog({
    action: "profile_update",
    actorId: params.userId,
    detail: "messenger profile updated",
  });
}

export async function listDirectory(viewerId: string) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      approvalStatus: "APPROVED",
      id: { not: viewerId },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      jobs: { select: { jobCategory: { select: { name: true } } } },
      messengerProfile: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    jobs: u.jobs.map((j) => j.jobCategory.name),
    workplace: u.messengerProfile?.workplace ?? null,
    title: u.messengerProfile?.title ?? null,
    rank: u.messengerProfile?.rank ?? null,
    hiredAt: u.messengerProfile?.hiredAt ?? null,
    photoStorageKey: u.messengerProfile?.photoStorageKey ?? null,
    online: isOnline(u.messengerProfile?.lastSeenAt),
    lastSeenAt: u.messengerProfile?.lastSeenAt ?? null,
  }));
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export async function getOrCreateDm(userId: string, peerId: string) {
  if (userId === peerId) throw new Error("본인과는 대화할 수 없습니다.");
  const key = pairKey(userId, peerId);
  const existing = await prisma.messengerRoom.findUnique({
    where: { pairKey: key },
    include: { members: true },
  });
  if (existing) return existing;

  const peer = await prisma.user.findFirst({
    where: { id: peerId, isActive: true, approvalStatus: "APPROVED" },
    select: { id: true },
  });
  if (!peer) throw new Error("상대 회원을 찾을 수 없습니다.");

  const room = await prisma.messengerRoom.create({
    data: {
      isGroup: false,
      pairKey: key,
      members: {
        create: [{ userId }, { userId: peerId }],
      },
    },
    include: { members: true },
  });
  await writeMessengerLog({
    action: "dm_open",
    actorId: userId,
    targetUserId: peerId,
    roomId: room.id,
  });
  return room;
}

export async function listMyRooms(userId: string) {
  const memberships = await prisma.messengerRoomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  messengerProfile: { select: { lastSeenAt: true, photoStorageKey: true, title: true } },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
        },
      },
    },
    orderBy: { room: { updatedAt: "desc" } },
  });

  return memberships.map((m) => {
    const peers = m.room.members.filter((x) => x.userId !== userId);
  const last = m.room.messages[0];
    const unread =
      last &&
      last.senderId !== userId &&
      (!m.lastReadAt || last.createdAt > m.lastReadAt)
        ? 1
        : 0;
    return {
      id: m.room.id,
      title:
        m.room.title ||
        peers.map((p) => p.user.name).join(", ") ||
        "대화",
      peers: peers.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        online: isOnline(p.user.messengerProfile?.lastSeenAt),
        photoStorageKey: p.user.messengerProfile?.photoStorageKey ?? null,
        title: p.user.messengerProfile?.title ?? null,
      })),
      lastBody: last?.body ?? "",
      lastAt: last?.createdAt ?? m.room.updatedAt,
      lastReadAt: m.lastReadAt,
      unread,
    };
  });
}

export async function listMessages(userId: string, roomId: string, take = 80) {
  const member = await prisma.messengerRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) throw new Error("대화방에 참여하고 있지 않습니다.");

  const cutoff = new Date(Date.now() - MESSENGER_RETENTION_DAYS * 86400000);
  const messages = await prisma.messengerMessage.findMany({
    where: { roomId, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "asc" },
    take,
    include: {
      sender: { select: { id: true, name: true } },
      attachments: {
        select: { id: true, filename: true, mimeType: true, size: true },
      },
    },
  });

  await prisma.messengerRoomMember.update({
    where: { id: member.id },
    data: { lastReadAt: new Date() },
  });

  return messages;
}

export async function sendMessage(params: {
  userId: string;
  roomId: string;
  body: string;
  files?: File[];
}) {
  const member = await prisma.messengerRoomMember.findUnique({
    where: { roomId_userId: { roomId: params.roomId, userId: params.userId } },
  });
  if (!member) throw new Error("대화방에 참여하고 있지 않습니다.");

  const body = sanitizePlainText(params.body).slice(0, 4000);
  const files = (params.files ?? []).filter((f) => f && f.size > 0);
  if (!body && files.length === 0) throw new Error("메시지 또는 파일을 입력하세요.");
  if (files.length > MESSENGER_MAX_FILES) {
    throw new Error(`파일은 한 번에 최대 ${MESSENGER_MAX_FILES}개까지 보낼 수 있습니다.`);
  }
  for (const f of files) {
    if (f.size > MESSENGER_MAX_FILE_SIZE) {
      throw new Error(`"${f.name}" 이(가) 10MB를 초과합니다.`);
    }
  }

  const savedFiles = [];
  for (const f of files) {
    savedFiles.push(await saveUploadedFile(f, { userId: params.userId }));
  }

  const msg = await prisma.messengerMessage.create({
    data: {
      roomId: params.roomId,
      senderId: params.userId,
      body,
      attachments: {
        create: savedFiles.map((s, i) => ({
          filename: files[i]?.name ?? s.filename,
          storageKey: s.storageKey,
          mimeType: s.mimeType,
          size: s.size,
        })),
      },
    },
    include: {
      sender: { select: { id: true, name: true } },
      attachments: true,
    },
  });

  await prisma.messengerRoom.update({
    where: { id: params.roomId },
    data: { updatedAt: new Date() },
  });

  const others = await prisma.messengerRoomMember.findMany({
    where: { roomId: params.roomId, userId: { not: params.userId } },
    select: { userId: true },
  });
  await Promise.all(
    others.map((o) =>
      createNotification({
        userId: o.userId,
        type: "MESSENGER",
        title: "새 메신저 메시지",
        body: body ? body.slice(0, 80) : "파일이 도착했습니다.",
        link: "/messenger",
      }).catch(() => undefined),
    ),
  );

  await writeMessengerLog({
    action: files.length ? "file_send" : "chat_send",
    actorId: params.userId,
    roomId: params.roomId,
    messageId: msg.id,
    detail: files.length
      ? `files=${files.map((f) => f.name).join(",")}`
      : body.slice(0, 120),
  });

  return msg;
}

export async function getAttachmentForUser(userId: string, attachmentId: string) {
  const att = await prisma.messengerAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: { select: { roomId: true } },
    },
  });
  if (!att) return null;
  const member = await prisma.messengerRoomMember.findUnique({
    where: { roomId_userId: { roomId: att.message.roomId, userId } },
  });
  if (!member) return null;
  return att;
}

export async function listAdminLogs(take = 200) {
  return prisma.messengerLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

/** 1년 경과 메시지 삭제 + 해당 사용자에게 월간 백업 안내 */
export async function runMessengerRetentionJob(now = new Date()) {
  const cutoff = new Date(now.getTime() - MESSENGER_RETENTION_DAYS * 86400000);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const old = await prisma.messengerMessage.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, senderId: true, roomId: true },
  });

  const byUser = new Map<string, number>();
  for (const m of old) {
    byUser.set(m.senderId, (byUser.get(m.senderId) ?? 0) + 1);
  }

  if (old.length > 0) {
    const ids = old.map((m) => m.id);
    for (let i = 0; i < ids.length; i += 500) {
      await prisma.messengerMessage.deleteMany({
        where: { id: { in: ids.slice(i, i + 500) } },
      });
    }
  }

  const users = await prisma.user.findMany({
    where: { isActive: true, approvalStatus: "APPROVED" },
    select: { id: true },
  });

  for (const u of users) {
    const purged = byUser.get(u.id) ?? 0;
    try {
      await prisma.messengerBackupNoticeLog.create({
        data: { userId: u.id, year, month, purged },
      });
    } catch {
      continue;
    }
    await createNotification({
      userId: u.id,
      type: "MESSENGER_BACKUP",
      title: "메신저 대화 보관 안내",
      body:
        purged > 0
          ? `1년이 지난 메신저 메시지 ${purged}건이 삭제되었습니다. 중요 대화는 미리 백업해 주세요. (보관 기간 1년)`
          : "메신저 대화는 1년간 보관 후 자동 삭제됩니다. 중요 내용은 주기적으로 백업해 주세요.",
      link: "/messenger",
    }).catch(() => undefined);
  }

  await writeMessengerLog({
    action: "retention_purge",
    detail: `purged=${old.length} year=${year} month=${month}`,
  });

  return { purged: old.length, notified: users.length };
}
