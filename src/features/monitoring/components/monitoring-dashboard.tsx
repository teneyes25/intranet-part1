"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Database,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MonitoringData {
  timestamp: string;
  onlineUsers: number;
  logins: { last1h: number; last24h: number };
  ai: { events1h: number; events24h: number; estimatedTokens24h: number };
  errors: { last1h: number; last24h: number; errorRate24h: number };
  orders24h: number;
  infrastructure: {
    database: { sizeHuman: string };
    redis: { connected: boolean; memoryHuman?: string; latencyMs?: number | null };
    uptimeSec: number;
  };
  loginTrend: { label: string; count: number }[];
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const id = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        모니터링 데이터 로딩…
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-destructive">모니터링 오류: {error}</p>;
  }

  if (!data) return null;

  const uptimeH = Math.floor(data.infrastructure.uptimeSec / 3600);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          마지막 갱신: {new Date(data.timestamp).toLocaleString("ko-KR")} · 30초 자동 새로고침
        </p>
        <Button size="sm" variant="outline" onClick={() => void fetchMetrics()}>
          <RefreshCw className="h-4 w-4" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Users}
          label="접속자 (15분)"
          value={String(data.onlineUsers)}
          hint={`24h 로그인 ${data.logins.last24h}`}
        />
        <MetricCard
          icon={Bot}
          label="AI 이벤트 (24h)"
          value={String(data.ai.events24h)}
          hint={`≈ ${(data.ai.estimatedTokens24h / 1000).toFixed(0)}k tokens`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="에러율 (24h)"
          value={`${data.errors.errorRate24h}%`}
          hint={`${data.errors.last24h}건 / 1h ${data.errors.last1h}건`}
          alert={data.errors.errorRate24h > 1}
        />
        <MetricCard
          icon={Activity}
          label="Part 2 주문 (24h)"
          value={String(data.orders24h)}
          hint={`로그인 1h ${data.logins.last1h}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              인프라 상태
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="DB 용량" value={data.infrastructure.database.sizeHuman} />
            <Row
              label="Redis"
              value={
                data.infrastructure.redis.connected
                  ? `${data.infrastructure.redis.memoryHuman ?? "OK"} · ${data.infrastructure.redis.latencyMs ?? "?"}ms`
                  : "미연결"
              }
            />
            <Row label="App uptime" value={`${uptimeH}시간+`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">24h 로그인 추이 (4h 버킷)</CardTitle>
            <CardDescription>최근 접속 패턴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-end gap-2">
              {data.loginTrend.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{
                      height: `${Math.max(4, Math.min(100, b.count * 8))}%`,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{b.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/50" : undefined}>
      <CardContent className="flex items-start gap-3 pt-6">
        <Icon className={`h-8 w-8 ${alert ? "text-destructive" : "text-primary/70"}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {alert && (
            <Badge variant="destructive" className="mt-1">
              점검 필요
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
