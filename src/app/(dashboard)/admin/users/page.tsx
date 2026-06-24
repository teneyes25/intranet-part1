import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { UserTable } from "@/features/users/components/user-table";
import { BulkUserImportPanel } from "@/features/users/bulk-import/bulk-import-panel";
import { listUsers } from "@/features/users/services/user-service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "사용자 관리",
};

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);
  const users = await listUsers();

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        description="시스템 사용자·가입 승인·CSV 대량 등록"
      />
      <div className="mb-6">
        <BulkUserImportPanel />
      </div>
      <UserTable users={users} />
    </div>
  );
}
