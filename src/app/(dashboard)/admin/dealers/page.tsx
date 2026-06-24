import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { DealerBulkImportPanel } from "@/features/dealers/components/dealer-bulk-import";
import { DealerTable } from "@/features/dealers/components/dealer-table";
import { listDealers } from "@/features/dealers/dealer-service";
import { BulkUserImportPanel } from "@/features/users/bulk-import/bulk-import-panel";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 관리",
};

export default async function AdminDealersPage() {
  await requireRole(["ADMIN"]);
  const dealers = await listDealers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="대리점 관리"
        description="대리점 등록·Rollout·브랜딩·사용자 대량 등록"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <DealerBulkImportPanel />
        <BulkUserImportPanel />
      </div>
      <DealerTable dealers={dealers} />
    </div>
  );
}
