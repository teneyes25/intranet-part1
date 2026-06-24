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
  title: "권한/보안",
};

export default async function AdminSecurityPage() {
  await requireRole(["ADMIN"]);

  return (
    <div>
      <PageHeader
        title="권한 / 보안"
        description="역할 기반 접근 제어(RBAC) 설정 영역입니다. (ADMIN 전용)"
      />
      <Card>
        <CardHeader>
          <CardTitle>역할 정책</CardTitle>
          <CardDescription>
            HEADQUARTER · DEALER · ADMIN 세 가지 역할로 접근을 제어합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          이후 파트에서 역할별 세부 권한 매트릭스를 구성합니다.
        </CardContent>
      </Card>
    </div>
  );
}
