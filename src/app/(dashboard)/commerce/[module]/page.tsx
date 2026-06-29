import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
import type { CommerceModuleId } from "@/features/commerce/types";
import { requireRole } from "@/lib/auth/session";

const SLUG_TO_MODULE: Record<string, CommerceModuleId> = {
  "tax-invoices": "tax-invoice",
  payments: "payment",
  contracts: "contract",
};

const PAGE_META: Record<CommerceModuleId, { title: string; eyebrow: string }> = {
  order: { title: "발주서", eyebrow: "B2B Order" },
  "tax-invoice": { title: "세금계산서", eyebrow: "Tax Invoice" },
  payment: { title: "카드결제", eyebrow: "Payment" },
  contract: { title: "표준계약서", eyebrow: "Contract" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module } = await params;
  const moduleId = SLUG_TO_MODULE[module];
  return { title: moduleId ? PAGE_META[moduleId].title : "거래 모듈" };
}

export default async function CommerceModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  await requireRole(["DEALER", "HEADQUARTER", "ADMIN"]);
  const { module } = await params;
  const moduleId = SLUG_TO_MODULE[module];

  if (!moduleId) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        모듈을 찾을 수 없습니다.{" "}
        <Link href="/commerce" className="text-primary underline">
          거래 허브
        </Link>
      </div>
    );
  }

  const stub = buildCommerceStubResponse(moduleId);
  const pageMeta = PAGE_META[moduleId];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/commerce">
          <ArrowLeft className="h-4 w-4" />
          거래 모듈
        </Link>
      </Button>

      <PageHeader
        eyebrow={pageMeta.eyebrow}
        title={pageMeta.title}
        description="Part 2 실연동 전 Preview 화면입니다."
      />

      <Card className="surface-card border-dashed">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{stub.message}</CardTitle>
            <Badge variant="secondary">Part 2</Badge>
          </div>
          <CardDescription className="font-mono text-xs">{stub.apiPath}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Visual Page Builder에서 <strong>{pageMeta.title}</strong> 위젯을 배치하면 런타임에
            B2B 거래 카드가 하이드레이션됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
