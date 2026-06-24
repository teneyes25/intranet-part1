import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 현황",
};

export default async function DealerPage() {
  await requireRole(["HEADQUARTER", "ADMIN"]);

  return (
    <div>
      <PageHeader
        title="대리점 현황"
        description="본사에서 대리점 현황을 조회하는 영역입니다. (HEADQUARTER, ADMIN)"
      />
      <Card>
        <CardHeader>
          <CardTitle>대리점 목록</CardTitle>
          <CardDescription>
            대리점 등록/조회 기능이 이후 파트에서 추가됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          기본 골격만 준비되어 있습니다.
        </CardContent>
      </Card>
    </div>
  );
}
