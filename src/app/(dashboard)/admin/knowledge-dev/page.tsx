import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/session";
import { isKnowledgeV1Enabled } from "@/lib/knowledge/flags";

export const metadata: Metadata = { title: "Knowledge v1 개발 상태" };

export default async function KnowledgeDevPage() {
  await requireRole(["ADMIN"]);
  const enabled = isKnowledgeV1Enabled();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Knowledge v1 (개발)"
        description="승인 버전 검색 카탈로그. 기본 플래그는 OFF이며 운영 배포 대상이 아닙니다."
      />
      <div className="rounded-lg border p-4 text-sm">
        <p>기능 플래그: {enabled ? "ON" : "OFF"}</p>
        <p className="mt-2 text-muted-foreground">
          상태 API: <code>/api/dev/knowledge/status</code> (ADMIN). 검색 API는
          플래그가 켜진 경우에만 동작하며, 권한 문맥은 서버 세션에서만 만듭니다.
        </p>
      </div>
    </div>
  );
}
