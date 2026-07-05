import "server-only";

import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { GLOBAL_LAYOUT_SCOPE } from "@/features/page-layout/types";
import { getPilotSettings, isPilotModeActive } from "@/features/pilot/pilot-service";

export type PilotKpiStatus = "ok" | "warn" | "bad" | "na";

export interface PilotKpiItem {
  id: string;
  label: string;
  description: string;
  value: number | null;
  displayValue: string;
  target: number;
  targetLabel: string;
  unit: "percent" | "count";
  status: PilotKpiStatus;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function statusForPercent(value: number | null, target: number): PilotKpiStatus {
  if (value == null) return "na";
  if (value >= target) return "ok";
  if (value >= target * 0.85) return "warn";
  return "bad";
}

function statusForCount(value: number, target: number): PilotKpiStatus {
  if (value <= target) return "ok";
  return "bad";
}

export async function getPilotKpiSummary() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const settings = await getPilotSettings();
  const pilotActive = isPilotModeActive(settings);

  const pilotMemberIds = await prisma.pilotGroupMember.findMany({
    where: { pilotGroup: { isActive: true } },
    select: { userId: true },
  });
  const pilotUserIdSet = new Set(pilotMemberIds.map((m) => m.userId));

  const dealerUsers = await prisma.user.findMany({
    where: {
      role: Role.DEALER,
      isActive: true,
      approvalStatus: "APPROVED",
      ...(pilotUserIdSet.size > 0 ? { id: { in: [...pilotUserIdSet] } } : {}),
    },
    select: { id: true, dealerId: true },
  });

  const dealerIds = [...new Set(dealerUsers.map((u) => u.dealerId).filter(Boolean))] as string[];
  const dealerUserIds = dealerUsers.map((u) => u.id);
  const totalDealers = dealerIds.length;

  const [activeDealerLogins, activeUsers, aiChatUsers, layoutAudits, noticePosts, systemErrors] =
    await Promise.all([
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: {
          action: "LOGIN_SUCCESS",
          createdAt: { gte: since },
          userId: { in: dealerUserIds.length ? dealerUserIds : ["__none__"] },
        },
        _count: { id: true },
      }),
      prisma.usageMetric.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: since },
          userId: { not: null },
        },
        _count: { id: true },
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: {
          action: "AI_CHAT",
          createdAt: { gte: since },
          userId: { not: null },
        },
        _count: { id: true },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "SITE_CUSTOMIZE",
          detail: "grapesjs_saved",
          createdAt: { gte: since },
          resource: { startsWith: "page_layout:" },
        },
        select: { resource: true, userId: true },
      }),
      prisma.post.findMany({
        where: {
          isPinned: true,
          createdAt: { gte: since },
          board: { key: "notices" },
        },
        select: { viewCount: true },
      }),
      prisma.systemErrorLog.count({
        where: { createdAt: { gte: since } },
      }),
    ]);

  const activeDealerCount = activeDealerLogins.length;
  const weeklyActiveDealerPct = pct(activeDealerCount, totalDealers);

  const noticeReachPct =
    noticePosts.length > 0 && totalDealers > 0
      ? Math.min(
          100,
          Math.round(
            (noticePosts.reduce((s, p) => s + p.viewCount, 0) /
              (noticePosts.length * totalDealers)) *
              1000,
          ) / 10,
        )
      : null;

  const selfServiceDealerIds = new Set<string>();
  for (const row of layoutAudits) {
    const parts = row.resource?.split(":") ?? [];
    const scope = parts[2];
    if (scope && scope !== GLOBAL_LAYOUT_SCOPE) {
      selfServiceDealerIds.add(scope);
    }
  }
  const pbSelfServicePct = pct(selfServiceDealerIds.size, totalDealers);

  const activeUserCount = activeUsers.length;
  const aiUsagePct = pct(aiChatUsers.length, activeUserCount);

  const kpis: PilotKpiItem[] = [
    {
      id: "weeklyActiveDealers",
      label: "주간 활성 대리점",
      description: "주 1회 이상 로그인한 대리점 / Pilot 대리점",
      value: weeklyActiveDealerPct,
      displayValue: weeklyActiveDealerPct != null ? `${weeklyActiveDealerPct}%` : "—",
      target: 70,
      targetLabel: "≥ 70%",
      unit: "percent",
      status: statusForPercent(weeklyActiveDealerPct, 70),
    },
    {
      id: "noticeReach",
      label: "공지 도달·확인",
      description: "중요 공지 조회율(7일, 조회수 기준 추정)",
      value: noticeReachPct,
      displayValue: noticeReachPct != null ? `${noticeReachPct}%` : "—",
      target: 80,
      targetLabel: "≥ 80%",
      unit: "percent",
      status: statusForPercent(noticeReachPct, 80),
    },
    {
      id: "pageBuilderSelfService",
      label: "Page Builder 자립도",
      description: "대리점 scope 레이아웃 저장 비율",
      value: pbSelfServicePct,
      displayValue: pbSelfServicePct != null ? `${pbSelfServicePct}%` : "—",
      target: 50,
      targetLabel: "≥ 50%",
      unit: "percent",
      status: statusForPercent(pbSelfServicePct, 50),
    },
    {
      id: "aiAgentUsage",
      label: "AI Agent 활용",
      description: "주간 활성 사용자 중 AI 질문 1회 이상",
      value: aiUsagePct,
      displayValue: aiUsagePct != null ? `${aiUsagePct}%` : "—",
      target: 30,
      targetLabel: "≥ 30%",
      unit: "percent",
      status: statusForPercent(aiUsagePct, 30),
    },
    {
      id: "systemErrors",
      label: "장애·롤백",
      description: "7일 내 시스템 에러 로그",
      value: systemErrors,
      displayValue: `${systemErrors}건`,
      target: 0,
      targetLabel: "0건",
      unit: "count",
      status: statusForCount(systemErrors, 0),
    },
    {
      id: "trainingComplete",
      label: "교육 완료",
      description: "Pilot 관리 체크리스트 수동 확인",
      value: null,
      displayValue: "수동",
      target: 100,
      targetLabel: "100%",
      unit: "percent",
      status: "na",
    },
  ];

  return {
    pilotActive,
    pilotModeEnv: process.env.PILOT_MODE === "true",
    periodDays: 7,
    totalDealers,
    activeDealerCount,
    activeUserCount,
    kpis,
  };
}

export type PilotKpiSummary = Awaited<ReturnType<typeof getPilotKpiSummary>>;
