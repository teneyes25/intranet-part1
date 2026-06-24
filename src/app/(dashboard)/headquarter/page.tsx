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
  title: "본사 관리",
};

export default async function HeadquarterPage() {
  await requireRole(["HEADQUARTER", "ADMIN"]);

  return (
    <div>
      <PageHeader
        title="본사 관리"
        description="본사 운영 담당자를 위한 영역입니다. (HEADQUARTER, ADMIN)"
      />
      <Card>
        <CardHeader>
          <CardTitle>본사 대시보드</CardTitle>
          <CardDescription>
            대리점 공지, 정책 배포, 실적 집계 등이 이곳에 추가됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          기본 골격만 준비되어 있습니다.
        </CardContent>
      </Card>
    </div>
  );
}
