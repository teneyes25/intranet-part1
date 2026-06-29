import "server-only";

import { prisma } from "@/lib/prisma";
import { listApprovalLineTemplates, listApprovalTemplates } from "./approval-service";
import { listIngestJobs } from "./ai-ingest-service";
import { listIntegrations } from "./integration-service";
import { getSiteSettings, parseDashboardLayout, parsePageBuilderConfig } from "./site-settings-service";

export async function getCustomizePageData() {
  const [settings, templates, lineTemplates, ingestJobs, integrations, boards, users] =
    await Promise.all([
      getSiteSettings(),
      listApprovalTemplates(),
      listApprovalLineTemplates(),
      listIngestJobs(15),
      listIntegrations(),
      prisma.board.findMany({ orderBy: { name: "asc" }, select: { key: true, name: true } }),
      prisma.user.findMany({
        where: { isActive: true, approvalStatus: "APPROVED" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true },
      }),
    ]);

  return {
    settings,
    layout: parseDashboardLayout(settings.dashboardLayout),
    pageBuilder: parsePageBuilderConfig(settings.pageBuilderConfig),
    templates,
    lineTemplates,
    ingestJobs,
    integrations,
    boards,
    users,
  };
}
