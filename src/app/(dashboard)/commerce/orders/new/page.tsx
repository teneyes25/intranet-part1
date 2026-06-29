import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildCommerceStubResponse } from "@/features/commerce/module-registry";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "발주서",
};

export default async function CommerceOrderPage() {
  await requireRole(["DEALER", "HEADQUARTER", "ADMIN"]);
  const stub = buildCommerceStubResponse("order");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/commerce">
            <ArrowLeft className="h-4 w-4" />
            거래 모듈
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="B2B Order"
        title="발주서 작성"
        description="대리점 Self-Service 발주 — Part 2 API 연동 예정"
      />

      <Card className="surface-card border-dashed">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{stub.message}</CardTitle>
              <CardDescription className="font-mono text-xs">{stub.apiPath}</CardDescription>
            </div>
            <Badge className="ml-auto" variant="secondary">
              Part 2
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Page Builder의 <strong>발주서 위젯</strong>을 대시보드나 대리점 포털 레이아웃에
            배치하면, 게시 시 아래와 같은 B2B 발주 UI가 표시됩니다.
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>SKU 검색 · 수량 입력 · 결재 연동</li>
            <li>대리점별 가격·재고 정책 (Rollout 연동)</li>
            <li>본사 승인 워크플로 (전자결재 연계)</li>
          </ul>
          <Button asChild variant="outline">
            <Link href="/api/v2/orders">API 미리보기 (인증 필요)</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
