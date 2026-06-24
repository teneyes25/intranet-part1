import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  LayoutPanelLeft,
  Users,
  MessageSquare,
  Megaphone,
  Sparkles,
  ArrowRight,
  Bot,
  Pin,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import { getDashboardData } from "@/features/dashboard/queries";
import { mergeDashboardLayoutForRole } from "@/lib/production/dashboard-defaults";
import { getSiteSettings, parseDashboardLayout } from "@/features/customize/site-settings-service";
import type { DashboardLayoutConfig } from "@/features/customize/types";
import { getVisibleNavGroups } from "@/config/navigation";
import { formatDate } from "@/features/board/utils";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "홈",
};

function isWidgetVisible(layout: DashboardLayoutConfig, id: string) {
  return layout.widgets.find((w) => w.id === id)?.visible ?? true;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, settings] = await Promise.all([getDashboardData(), getSiteSettings()]);
  const layout = mergeDashboardLayoutForRole(
    user.role,
    parseDashboardLayout(settings.dashboardLayout),
  );
  const today = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(
    new Date(),
  );

  // 빌드된 메뉴(기능)를 역할에 맞춰 전부 노출 — '홈' 자신은 제외
  const featureGroups = getVisibleNavGroups(user.role)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.href !== "/dashboard"),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              안녕하세요, {user.name}님
            </h2>
            <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="text-muted-foreground">{today}</p>
        </div>
      </div>

      {layout.showBanner && settings.bannerStorageKey && (
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          {settings.bannerMediaType === "video" ? (
            <video
              className="max-h-64 w-full object-cover"
              src="/api/branding/asset?asset=banner"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/api/branding/asset?asset=banner"
              alt=""
              className="max-h-64 w-full object-cover"
            />
          )}
        </div>
      )}

      {/* 실데이터 지표 */}
      {isWidgetVisible(layout, "stats") && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="전체 게시글"
          value={`${data.postCount}건`}
          hint="모든 게시판"
          icon={FileText}
          href="/boards/general"
        />
        <StatCard
          title="운영 게시판"
          value={`${data.boardCount}개`}
          hint="베이스 보드 시스템"
          icon={LayoutPanelLeft}
          href="/boards/notices"
        />
        <StatCard
          title="등록 사용자"
          value={`${data.userCount}명`}
          hint="본사·대리점·관리자"
          icon={Users}
          href={user.role === "ADMIN" ? "/admin/users" : "/settings"}
        />
        <StatCard
          title="댓글"
          value={`${data.commentCount}건`}
          hint="전체 누적"
          icon={MessageSquare}
          href="/boards/general"
        />
      </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 최근 게시글 (실데이터) */}
        <div className="space-y-6 lg:col-span-2">
          {isWidgetVisible(layout, "recentPosts") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                최근 게시글
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/boards/notices">
                  공지 전체보기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentPosts.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  아직 등록된 게시글이 없습니다.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.recentPosts.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/boards/${p.board.key}/${p.id}`}
                        className="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        {p.isPinned && (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <Badge variant="secondary">{p.board.name}</Badge>
                        <span className="flex-1 truncate font-medium">
                          {p.title}
                        </span>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {p.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          )}

          {isWidgetVisible(layout, "activityChart") && (
          <ActivityChart data={data.activityChart} />
          )}

          {/* 전체 기능 바로가기 (빌드된 모듈 노출) */}
          {isWidgetVisible(layout, "shortcuts") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">전체 기능 바로가기</CardTitle>
              <CardDescription>
                권한에 따라 이용 가능한 모든 메뉴입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {featureGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}
        </div>

        {/* 우측: AI 요약 + 내 정보 */}
        <div className="space-y-6">
          {isWidgetVisible(layout, "aiSummary") && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                AI 데일리 요약
              </CardTitle>
              <CardDescription>현재 워크스페이스 현황 요약</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex gap-2">
                <span className="text-primary">•</span>
                전체 <strong>{data.postCount}건</strong>의 게시글이{" "}
                <strong>{data.boardCount}개</strong> 게시판에 등록되어 있습니다.
              </p>
              <p className="flex gap-2">
                <span className="text-primary">•</span>
                누적 댓글 <strong>{data.commentCount}건</strong>, 사용자{" "}
                <strong>{data.userCount}명</strong>이 활동 중입니다.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                <Link href="/ai-agent">
                  <Bot className="h-4 w-4" />
                  AI 에이전트 열기
                </Link>
              </Button>
            </CardContent>
          </Card>
          )}

          {isWidgetVisible(layout, "account") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">내 계정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">이름</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">권한</span>
                <span className="font-medium">{ROLE_LABELS[user.role]}</span>
              </div>
              {user.dealerName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">소속 대리점</span>
                  <span className="font-medium">{user.dealerName}</span>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}
