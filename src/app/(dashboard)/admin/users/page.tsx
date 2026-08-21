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
  const admin = await requireRole(["ADMIN"]);
  const users = await listUsers();

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        description="가입 승인·비밀번호 초기화·활성화/비활성화·강제 탈퇴·CSV 대량 등록"
      />
      <div className="mb-6">
        <BulkUserImportPanel />
      </div>
      <UserTable users={users} currentUserId={admin.id} />
    </div>
  );
}
