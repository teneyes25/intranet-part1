import type { Metadata } from "next";
import Link from "next/link";

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
import { COMMERCE_MODULES } from "@/features/commerce/module-registry";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "B2B 거래",
};

export default async function CommerceHubPage() {
  await requireRole(["DEALER", "HEADQUARTER", "ADMIN"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="B2B Commerce"
        title="거래 모듈"
        description="Shopify B2B 스타일 Self-Service 거래 기능 — Part 2에서 실연동됩니다."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(COMMERCE_MODULES).map((m) => (
          <Card key={m.id} className="surface-card transition-shadow hover:shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{m.label}</CardTitle>
                <Badge variant="secondary">Preview</Badge>
              </div>
              <CardDescription>{m.apiPath}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={m.href}>모듈 열기</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
