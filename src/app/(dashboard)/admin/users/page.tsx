import type { Metadata } from "next";

import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UserTable } from "@/features/users/components/user-table";
import { BulkUserImportPanel } from "@/features/users/bulk-import/bulk-import-panel";
import { listUsers } from "@/features/users/services/user-service";
import { listJobCategories } from "@/features/jobs/service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "사용자 관리",
};

export default async function AdminUsersPage() {
  const admin = await requireRole(["ADMIN"]);
  const [users, jobCategories] = await Promise.all([
    listUsers(),
    listJobCategories(),
  ]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          title="사용자 관리"
          description="가입 승인·업무(복수) 배정·비밀번호 초기화·활성화/비활성화·강제 탈퇴·CSV 대량 등록"
        />
        <Button asChild variant="outline">
          <Link href="/admin/jobs">업무 카테고리 관리</Link>
        </Button>
      </div>
      <div className="mb-6">
        <BulkUserImportPanel />
      </div>
      <UserTable
        users={users}
        currentUserId={admin.id}
        jobCategories={jobCategories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
