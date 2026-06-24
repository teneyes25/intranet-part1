import "server-only";

import { prisma } from "@/lib/prisma";
import { isPilotModeEnv } from "@/lib/pilot/config";
import type { PilotBannerConfig } from "@/features/pilot/types";

export async function getPilotSettings() {
  const row = await prisma.pilotSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    return prisma.pilotSettings.create({ data: { id: "default" } });
  }
  return row;
}

export function isPilotModeActive(settings: { isActive: boolean }) {
  return isPilotModeEnv() || settings.isActive;
}

export async function isPilotUser(userId: string) {
  const settings = await getPilotSettings();
  if (!isPilotModeActive(settings)) return false;
  const count = await prisma.pilotGroupMember.count({
    where: {
      userId,
      pilotGroup: { isActive: true },
    },
  });
  return count > 0;
}

export async function getPilotBannerForUser(userId: string): Promise<PilotBannerConfig> {
  const settings = await getPilotSettings();
  if (!isPilotModeActive(settings)) {
    return { show: false, title: "", message: "", feedbackEnabled: false };
  }
  const member = await isPilotUser(userId);
  if (!member) {
    return { show: false, title: "", message: "", feedbackEnabled: false };
  }
  return {
    show: true,
    title: settings.bannerTitle,
    message: settings.bannerMessage,
    feedbackEnabled: settings.feedbackEnabled,
  };
}

export async function listPilotGroups() {
  return prisma.pilotGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });
}

export async function updatePilotSettings(data: {
  isActive?: boolean;
  bannerTitle?: string;
  bannerMessage?: string;
  feedbackEnabled?: boolean;
}) {
  return prisma.pilotSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      isActive: data.isActive ?? false,
      bannerTitle: data.bannerTitle ?? "Pilot 테스트 기간",
      bannerMessage:
        data.bannerMessage ??
        "현재 파일럿(Pilot) 테스트 중입니다. 피드백을 남겨 주세요.",
      feedbackEnabled: data.feedbackEnabled ?? true,
    },
    update: {
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.bannerTitle !== undefined && { bannerTitle: data.bannerTitle }),
      ...(data.bannerMessage !== undefined && { bannerMessage: data.bannerMessage }),
      ...(data.feedbackEnabled !== undefined && { feedbackEnabled: data.feedbackEnabled }),
    },
  });
}

export async function setPilotGroupMembers(groupId: string, userIds: string[]) {
  await prisma.pilotGroupMember.deleteMany({ where: { pilotGroupId: groupId } });
  if (userIds.length === 0) return;
  await prisma.pilotGroupMember.createMany({
    data: userIds.map((userId) => ({ pilotGroupId: groupId, userId })),
    skipDuplicates: true,
  });
}

export async function createPilotGroup(data: {
  key: string;
  name: string;
  description?: string;
}) {
  return prisma.pilotGroup.create({ data });
}

export async function deletePilotGroup(id: string) {
  return prisma.pilotGroup.delete({ where: { id } });
}
