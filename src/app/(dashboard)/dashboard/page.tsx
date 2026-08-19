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
  CalendarDays,
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
import { getSiteSettings, parseDashboardLayout, parsePageBuilderConfig } from "@/features/customize/site-settings-service";
import { PageLayoutRenderer } from "@/features/page-layout/components/layout-renderer";
import { getPageLayout } from "@/features/page-layout/service";
import type { DashboardLayoutConfig } from "@/features/customize/types";
import { getVisibleNavGroups } from "@/config/navigation";
import { formatDate, formatDateTime } from "@/features/board/utils";
import {
  getBoardByKey,
  listScheduleEvents,
  SCHEDULE_BOARD_KEY,
} from "@/features/board/queries";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { canAccessBoard } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "홈",
};

function isWidgetVisible(layout: DashboardLayoutConfig, id: string) {
  return layout.widgets.find((w) => w.id === id)?.visible ?? true;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, settings, bannerLayout, dashboardLayout, scheduleBoard] =
    await Promise.all([
      getDashboardData(),
      getSiteSettings(),
      getPageLayout("banner", user.dealerId),
      getPageLayout("dashboard", user.dealerId),
      getBoardByKey(SCHEDULE_BOARD_KEY),
    ]);
  const layout = mergeDashboardLayoutForRole(
    user.role,
    parseDashboardLayout(settings.dashboardLayout),
  );
  const pageBuilder = parsePageBuilderConfig(settings.pageBuilderConfig);
  const today = new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(
    new Date(),
  );

  const showSchedule =
    !!scheduleBoard && canAccessBoard(user.role, SCHEDULE_BOARD_KEY);
  let upcomingSchedule: Awaited<ReturnType<typeof listScheduleEvents>> = [];
  if (showSchedule && scheduleBoard) {
    const now = new Date();
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    upcomingSchedule = (
      await listScheduleEvents({
        boardId: scheduleBoard.id,
        role: user.role,
        rangeStart: now,
        rangeEnd,
      })
    ).slice(0, 5);
  }

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
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              안녕하세요, {user.name}님
            </h2>
            <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          </div>
          <p className="text-muted-foreground">{today}</p>
        </div>
      </div>

      {dashboardLayout?.html && dashboardLayout.isPublished ? (
        <PageLayoutRenderer
          html={dashboardLayout.html}
          css={dashboardLayout.css}
          className="mb-2"
        />
      ) : null}

      {layout.showBanner && settings.bannerStorageKey && (
        <div className="relative overflow-hidden rounded-xl border bg-muted/30">
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
          {bannerLayout?.html && bannerLayout.isPublished ? (
            <div className="absolute inset-0 flex items-center bg-navy-900/30 p-4 sm:p-6">
              <PageLayoutRenderer
                html={bannerLayout.html}
                css={bannerLayout.css}
                className="w-full"
              />
            </div>
          ) : pageBuilder.banner?.title ? (
            <div className="absolute inset-0 flex flex-col items-start justify-center bg-navy-900/50 p-6 text-white">
              <p className="text-xl font-bold">{pageBuilder.banner.title}</p>
              {pageBuilder.banner.subtitle && (
                <p className="mt-1 text-sm text-white/80">{pageBuilder.banner.subtitle}</p>
              )}
              {pageBuilder.banner.buttonText && pageBuilder.banner.buttonLink && (
                <Button asChild size="sm" className="mt-3">
                  <Link href={pageBuilder.banner.buttonLink}>{pageBuilder.banner.buttonText}</Link>
                </Button>
              )}
            </div>
          ) : null}
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
        {showSchedule ? (
          <StatCard
            title="일정"
            value={`${upcomingSchedule.length}건`}
            hint="다가오는 일정 · 달력 보기"
            icon={CalendarDays}
            href="/boards/schedule"
          />
        ) : (
          <StatCard
            title="댓글"
            value={`${data.commentCount}건`}
            hint="전체 누적"
            icon={MessageSquare}
            href="/boards/general"
          />
        )}
      </div>
      )}

      {showSchedule && (
        <Card className="border-sky-200/80 bg-gradient-to-r from-sky-50/80 to-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-sky-700" />
              일정 달력
            </CardTitle>
            <Button asChild variant="default" size="sm">
              <Link href="/boards/schedule">
                달력 열기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingSchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                등록된 다가오는 일정이 없습니다.{" "}
                <Link
                  href="/boards/schedule/new"
                  className="font-medium text-sky-800 underline-offset-2 hover:underline"
                >
                  일정 등록
                </Link>
              </p>
            ) : (
              <ul className="divide-y">
                {upcomingSchedule.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/boards/schedule/${e.id}`}
                      className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:bg-sky-50/60"
                    >
                      {e.category && (
                        <Badge variant="secondary">{e.category}</Badge>
                      )}
                      <span className="flex-1 truncate font-medium">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {e.startsAt ? formatDateTime(e.startsAt) : formatDate(new Date())}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div
        className={
          pageBuilder.dashboard?.columns === "1"
            ? "grid gap-6"
            : pageBuilder.dashboard?.columns === "3"
              ? "grid gap-6 lg:grid-cols-3"
              : "grid gap-6 lg:grid-cols-3"
        }
      >
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
                        className="flex items-center gap-3 px-6 py-3.5 text-sm transition-all duration-200 hover:bg-primary/5"
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
                          className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-3.5 text-sm shadow-soft transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-card"
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
          <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-card">
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
