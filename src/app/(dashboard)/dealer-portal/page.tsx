import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  LayoutPanelLeft,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  ArrowRight,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { getDealerPortalStats } from "@/features/dealers/dealer-portal-queries";
import { COMMERCE_MODULES } from "@/features/commerce/module-registry";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 포털",
};

export default async function DealerPortalPage() {
  const user = await requireRole(["DEALER", "ADMIN"]);
  const stats = await getDealerPortalStats(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="B2B Self-Service"
        title="대리점 포털"
        description={
          user.dealerName
            ? `${user.dealerName} 워크스페이스 — 발주·재고·페이지 편집을 한곳에서 관리합니다.`
            : "대리점 전용 업무 공간입니다."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="전체 주문"
          value={String(stats.orderCount)}
          hint={`처리 대기 ${stats.pendingOrders}건`}
          icon={Package}
        />
        <StatCard
          title="등록 SKU"
          value={String(stats.inventorySkus)}
          hint={stats.lowStock > 0 ? `재고 부족 ${stats.lowStock}건` : "재고 정상"}
          icon={ShoppingCart}
        />
        <StatCard
          title="이번 주 공지"
          value={String(stats.recentNotices)}
          hint="확인 필요"
          icon={ClipboardList}
        />
        <StatCard
          title="거래 모듈"
          value="4"
          hint="Part 2 Preview"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="surface-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              빠른 작업
            </CardTitle>
            <CardDescription>대리점 Self-Service 핵심 기능</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
              <Link href="/admin/customize/page-builder">
                <LayoutPanelLeft className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">페이지 편집</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    대시보드·상품 상세 레이아웃
                  </p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
              <Link href="/commerce/orders/new">
                <Package className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">발주서 작성</p>
                  <p className="text-xs font-normal text-muted-foreground">B2B 주문 모듈</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
              <Link href="/boards/products">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">상품자료실</p>
                  <p className="text-xs font-normal text-muted-foreground">상세페이지 편집</p>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
              <Link href="/help/dealer">
                <ClipboardList className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">온보딩 가이드</p>
                  <p className="text-xs font-normal text-muted-foreground">대리점 운영 매뉴얼</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>내 대리점</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">대리점명</span>
              <span className="font-medium">{user.dealerName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">대리점 ID</span>
              <span className="font-mono text-xs">{user.dealerId ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>B2B 거래 모듈</CardTitle>
          <CardDescription>Page Builder에 배치 가능한 상거래 플레이스홀더 (Part 2 연동 예정)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Object.values(COMMERCE_MODULES).map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className="group flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
            >
              <div>
                <p className="font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.apiPath}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Preview</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {stats.recentOrders.length > 0 && (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>최근 주문</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/60">
            {stats.recentOrders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {o._count.items}개 품목 · {new Intl.DateTimeFormat("ko-KR").format(o.createdAt)}
                  </p>
                </div>
                <Badge variant="outline">{o.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
