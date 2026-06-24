import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { CustomizeCenter } from "@/features/customize/components/customize-center";
import { getCustomizePageData } from "@/features/customize/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "포털 커스터마이징",
};

export default async function AdminCustomizePage() {
  await requireRole(["ADMIN"]);
  const data = await getCustomizePageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="관리자 커스터마이징 센터"
        description="화면 디자인(로고·색상·배너), AI 학습, 전자결재, SNS 연동. 본사 Rollout 시 §13.3 순서로 브랜딩을 적용하세요."
      />
      <CustomizeCenter data={data} />
    </div>
  );
}
 