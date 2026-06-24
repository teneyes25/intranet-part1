"use client";

import type { getPilotMonitoringData } from "@/features/pilot/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FEEDBACK_CATEGORIES } from "@/features/pilot/types";

export function PilotMonitoringTab({
  data,
}: {
  data: Awaited<ReturnType<typeof getPilotMonitoringData>>;
}) {
  const catLabel = (v: string) =>
    FEEDBACK_CATEGORIES.find((c) => c.value === v)?.label ?? v;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>7일 활성 사용자</CardDescription>
            <CardTitle className="text-2xl">{data.dailyActiveUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>7일 이벤트</CardDescription>
            <CardTitle className="text-2xl">{data.totalEvents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>피드백 건수</CardDescription>
            <CardTitle className="text-2xl">{data.feedbackStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>평균 만족도</CardDescription>
            <CardTitle className="text-2xl">
              {data.feedbackStats.avgRating.toFixed(1)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이벤트별 사용량 (7일)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.usageByEvent.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 수집된 사용량이 없습니다.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.usageByEvent.map((u) => (
                <li key={u.event} className="flex justify-between py-2">
                  <span>{u.event}</span>
                  <Badge variant="secondary">{u.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 피드백</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y text-sm">
            {data.feedbacks.length === 0 ? (
              <li className="px-6 py-8 text-center text-muted-foreground">피드백 없음</li>
            ) : (
              data.feedbacks.map((f) => (
                <li key={f.id} className="px-6 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{f.user.name}</span>
                    <Badge variant="outline">{catLabel(f.category)}</Badge>
                    <Badge>{f.rating}점</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(f.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{f.message}</p>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">시스템 에러 로그</CardTitle>
          <CardDescription>발생 시 ADMIN에게 자동 알림</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y text-sm">
            {data.errors.length === 0 ? (
              <li className="px-6 py-8 text-center text-muted-foreground">에러 없음</li>
            ) : (
              data.errors.map((e) => (
                <li key={e.id} className="px-6 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">{e.source}</Badge>
                    {e.notified && <Badge variant="secondary">알림됨</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(e.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1">{e.message}</p>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
