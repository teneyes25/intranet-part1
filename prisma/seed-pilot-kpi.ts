/**
 * Pilot KPI 실측 데모 데이터 — UsageMetric · AuditLog · 공지 조회수
 * RUN_DEMO_SEED 후 또는 단독: npm run db:seed-pilot-kpi
 */
import { AuditAction, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 5), 0, 0, 0);
  return d;
}

async function main() {
  const [admin, hq, dealer] = await Promise.all([
    prisma.user.findUnique({ where: { email: "admin@intranet.local" } }),
    prisma.user.findUnique({ where: { email: "hq@intranet.local" } }),
    prisma.user.findUnique({ where: { email: "dealer@intranet.local" } }),
  ]);

  if (!admin || !hq || !dealer?.dealerId) {
    console.log("⚠️  demo users missing — run db:seed / db:seed-demo first");
    return;
  }

  await prisma.dealer.update({
    where: { id: dealer.dealerId },
    data: { rolloutActive: true, isActive: true },
  });

  const dealersGroup = await prisma.pilotGroup.upsert({
    where: { key: "dealers" },
    update: { isActive: true, name: "Pilot 대리점" },
    create: {
      key: "dealers",
      name: "Pilot 대리점",
      description: "KPI 실측용 Pilot 대리점 그룹",
    },
  });
  await prisma.pilotGroupMember.upsert({
    where: {
      pilotGroupId_userId: { pilotGroupId: dealersGroup.id, userId: dealer.id },
    },
    update: {},
    create: { pilotGroupId: dealersGroup.id, userId: dealer.id },
  });

  await prisma.pilotSettings.upsert({
    where: { id: "default" },
    update: { isActive: true },
    create: { id: "default", isActive: true },
  });

  const since = daysAgo(7);
  await prisma.usageMetric.deleteMany({
    where: { createdAt: { gte: since }, event: { in: ["page_view", "page_builder_save"] } },
  });

  const usageRows: {
    userId: string;
    event: string;
    resource?: string;
    createdAt: Date;
  }[] = [];

  for (const [userId, paths] of [
    [admin.id, ["/dashboard", "/admin/pilot", "/ai-agent"]] as const,
    [hq.id, ["/dashboard", "/boards/notices", "/ai-agent", "/approval/new"]] as const,
    [dealer.id, ["/dashboard", "/dealer-portal", "/boards/general"]] as const,
  ]) {
    for (let d = 0; d < 7; d += 2) {
      for (const path of paths) {
        usageRows.push({
          userId,
          event: "page_view",
          resource: path,
          createdAt: daysAgo(d),
        });
      }
    }
  }

  usageRows.push({
    userId: dealer.id,
    event: "page_builder_save",
    resource: `dashboard:${dealer.dealerId}`,
    createdAt: daysAgo(1),
  });

  await prisma.usageMetric.createMany({ data: usageRows });
  console.log(`✅ ${usageRows.length} usage metrics`);

  await prisma.auditLog.deleteMany({
    where: {
      createdAt: { gte: since },
      action: { in: [AuditAction.LOGIN_SUCCESS, AuditAction.AI_CHAT, AuditAction.SITE_CUSTOMIZE] },
    },
  });

  const auditRows = [
    {
      action: AuditAction.LOGIN_SUCCESS,
      userId: dealer.id,
      userEmail: dealer.email,
      resource: "session",
      detail: "pilot_kpi_seed",
      createdAt: daysAgo(1),
    },
    {
      action: AuditAction.LOGIN_SUCCESS,
      userId: dealer.id,
      userEmail: dealer.email,
      resource: "session",
      detail: "pilot_kpi_seed",
      createdAt: daysAgo(4),
    },
    {
      action: AuditAction.AI_CHAT,
      userId: hq.id,
      userEmail: hq.email,
      resource: "ai-agent",
      detail: "pilot_kpi_seed",
      createdAt: daysAgo(2),
    },
    {
      action: AuditAction.AI_CHAT,
      userId: admin.id,
      userEmail: admin.email,
      resource: "ai-agent",
      detail: "pilot_kpi_seed",
      createdAt: daysAgo(3),
    },
    {
      action: AuditAction.SITE_CUSTOMIZE,
      userId: dealer.id,
      userEmail: dealer.email,
      resource: `page_layout:dashboard:${dealer.dealerId}`,
      detail: "grapesjs_saved",
      createdAt: daysAgo(1),
    },
  ];

  for (const row of auditRows) {
    await prisma.auditLog.create({ data: row });
  }
  console.log(`✅ ${auditRows.length} audit logs`);

  const noticesBoard = await prisma.board.findUnique({ where: { key: "notices" } });
  if (noticesBoard) {
    await prisma.post.updateMany({
      where: { boardId: noticesBoard.id, isPinned: true },
      data: { viewCount: 85 },
    });
    console.log("✅ pinned notice viewCount → 85");
  }

  console.log("✅ pilot KPI demo seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
