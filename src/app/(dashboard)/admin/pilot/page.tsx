import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PilotAdminCenter } from "@/features/pilot/components/pilot-admin-center";
import { getPilotAdminPageData } from "@/features/pilot/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pilot 관리",
};

export default async function AdminPilotPage() {
  await requireRole(["ADMIN"]);
  const data = await getPilotAdminPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilot 배포 관리"
        description="Pilot 그룹, 사용량 모니터링, 피드백, 배포 체크리스트를 관리합니다."
      />
      <PilotAdminCenter data={data} />
    </div>
  );
}
