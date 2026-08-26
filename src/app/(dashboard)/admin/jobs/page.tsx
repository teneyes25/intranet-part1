import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { JobCategoryManager } from "@/features/jobs/components/job-category-manager";
import { listJobCategories } from "@/features/jobs/service";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "업무 카테고리" };

export default async function AdminJobsPage() {
  await requireRole(["ADMIN"]);
  const categories = await listJobCategories();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          title="업무 카테고리"
          description="사용자에게 배정할 업무(영업·인사·이사 등)를 추가·수정·삭제합니다. 복수 배정은 사용자 관리에서 설정합니다."
        />
        <Button asChild variant="outline">
          <Link href="/admin/users">사용자 관리</Link>
        </Button>
      </div>
      <JobCategoryManager categories={categories} />
    </div>
  );
}
