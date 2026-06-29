"use client";

import type { SiteSettings } from "@prisma/client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImageIcon, Layout, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  resetDashboardLayoutAction,
  saveDesignSettingsAction,
} from "@/features/customize/actions";
import type { DashboardLayoutConfig } from "@/features/customize/types";

const WIDGET_LABELS: Record<string, string> = {
  stats: "통계 카드",
  activityChart: "주간 활동 차트",
  recentPosts: "최근 게시글",
  shortcuts: "기능 바로가기",
  aiSummary: "AI 데일리 요약",
  account: "내 계정",
};

export function DesignTab({
  settings,
  layout,
}: {
  settings: SiteSettings;
  layout: DashboardLayoutConfig;
}) {
  const [pending, startTransition] = useTransition();
  const [widgets, setWidgets] = useState(layout.widgets);
  const [showBanner, setShowBanner] = useState(layout.showBanner);

  function toggleWidget(id: string) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" /> 브랜딩 & 색상
          </CardTitle>
          <CardDescription>로고, favicon, 배너, 테마 색상</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) =>
              startTransition(async () => {
                fd.set(
                  "dashboardLayout",
                  JSON.stringify({ showBanner, widgets }),
                );
                const r = await saveDesignSettingsAction(fd);
                if (r.error) toast.error(r.error);
                else toast.success("디자인 설정이 저장되었습니다.");
              })
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="appName">포털 이름</Label>
              <Input id="appName" name="appName" defaultValue={settings.appName} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary (HSL)</Label>
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  defaultValue={settings.primaryColor}
                  placeholder="222.2 47.4% 11.2%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sidebarColor">Sidebar</Label>
                <Input
                  id="sidebarColor"
                  name="sidebarColor"
                  defaultValue={settings.sidebarColor}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sidebarForeground">Sidebar 글자</Label>
                <Input
                  id="sidebarForeground"
                  name="sidebarForeground"
                  defaultValue={settings.sidebarForeground}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="logo">로고</Label>
                <Input id="logo" name="logo" type="file" accept="image/*" />
                {settings.logoStorageKey && (
                  <Image
                    src="/api/branding/asset?asset=logo"
                    alt="logo"
                    width={160}
                    height={40}
                    unoptimized
                    className="mt-1 h-10 w-auto object-contain"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon</Label>
                <Input id="favicon" name="favicon" type="file" accept="image/*,.ico" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner">메인 배너</Label>
                <Input
                  id="banner"
                  name="banner"
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              저장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layout className="h-4 w-4" /> 대시보드 레이아웃
          </CardTitle>
          <CardDescription>위젯 표시/숨김 (네이버 블로그 수준)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showBanner}
              onChange={(e) => setShowBanner(e.target.checked)}
            />
            메인 배너 표시
          </label>
          <ul className="space-y-2">
            {widgets
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{WIDGET_LABELS[w.id] ?? w.id}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={w.visible ? "default" : "outline"}
                    onClick={() => toggleWidget(w.id)}
                  >
                    {w.visible ? "표시" : "숨김"}
                  </Button>
                </li>
              ))}
          </ul>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            위젯 변경 후 왼쪽 폼에서 「저장」을 눌러 반영하세요.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              startTransition(async () => {
                await resetDashboardLayoutAction();
                toast.success("레이아웃을 기본값으로 복원했습니다.");
              })
            }
          >
            레이아웃 기본값 복원
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
