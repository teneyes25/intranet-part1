import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { MonitoringDashboard } from "@/features/monitoring/components/monitoring-dashboard";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "실시간 모니터링",
};

export default async function AdminMonitoringPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="실시간 모니터링"
        description="접속자·AI 사용량·DB/Redis·에러율 — 30초 자동 갱신"
      />
      <MonitoringDashboard />
    </div>
  );
}
