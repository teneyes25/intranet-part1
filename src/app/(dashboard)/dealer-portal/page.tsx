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

import { PageHero } from "@/components/layout/page-hero";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/features/dashboard/components/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDealerPortalStats } from "@/features/dealers/dealer-portal-queries";
import { COMMERCE_MODULES } from "@/features/commerce/module-registry";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "대리점 포털",
};

const QUICK_ACTIONS = [
  {
    href: "/admin/customize/page-builder",
    icon: LayoutPanelLeft,
    title: "페이지 편집",
    desc: "대시보드·상품 상세 레이아웃",
  },
  {
    href: "/commerce/orders/new",
    icon: Package,
    title: "발주서 작성",
    desc: "B2B 주문 모듈",
  },
  {
    href: "/boards/products",
    icon: ShoppingCart,
    title: "상품자료실",
    desc: "상세페이지 편집",
  },
  {
    href: "/help/dealer",
    icon: ClipboardList,
    title: "온보딩 가이드",
    desc: "대리점 운영 매뉴얼",
  },
] as const;

export default async function DealerPortalPage() {
  const user = await requireRole(["DEALER", "ADMIN"]);
  const stats = await getDealerPortalStats(user);

  return (
    <div className="page-shell">
      <PageHero
        eyebrow="B2B Self-Service"
        title="대리점 포털"
        description={
          user.dealerName
            ? `${user.dealerName} 워크스페이스 — 발주·재고·페이지 편집을 한곳에서 관리합니다.`
            : "대리점 전용 업무 공간입니다."
        }
        badge={user.dealerName ?? undefined}
      />

      <div className="b2b-kpi-strip">
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
          trend={stats.lowStock > 0 ? "down" : "neutral"}
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
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              빠른 작업
            </CardTitle>
            <CardDescription>대리점 Self-Service 핵심 기능</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="b2b-quick-action">
                <action.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>내 대리점</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="b2b-data-row px-6">
              <span className="text-muted-foreground">대리점명</span>
              <span className="font-medium">{user.dealerName ?? "—"}</span>
            </div>
            <div className="b2b-data-row px-6">
              <span className="text-muted-foreground">대리점 ID</span>
              <span className="font-mono text-xs">{user.dealerId ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle>B2B 거래 모듈</CardTitle>
          <CardDescription>Page Builder에 배치 가능한 상거래 플레이스홀더</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
          {Object.values(COMMERCE_MODULES).map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className="group flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-xs transition-all hover:border-primary/30 hover:shadow-card"
            >
              <div>
                <p className="font-semibold text-foreground">{m.label}</p>
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
        <Card>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle>최근 주문</CardTitle>
            <CardDescription>최근 5건의 B2B 주문 내역</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>주문번호</TableHead>
                  <TableHead>품목</TableHead>
                  <TableHead>일자</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{o._count.items}개</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Intl.DateTimeFormat("ko-KR").format(o.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{o.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
