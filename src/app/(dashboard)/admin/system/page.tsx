import type { Metadata } from "next";
import type { ComponentType } from "react";
import {
  Activity,
  Database,
  HardDrive,
  Server,
  Shield,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SystemAdminPanel } from "@/features/system/components/system-admin-panel";
import {
  getSystemOverview,
  listRecentEmergencyNotices,
  listRecentSystemErrors,
} from "@/features/system/system-service";
import { isDemoSeedEnabled, isProductionMode } from "@/lib/production/config";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "시스템 상태",
};

function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}시간 ${m}분`;
}

export default async function AdminSystemPage() {
  await requireRole(["ADMIN"]);
  const [overview, notices, errors] = await Promise.all([
    getSystemOverview(),
    listRecentEmergencyNotices(5),
    listRecentSystemErrors(5),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="시스템 상태"
        description="Docker 컨테이너·DB·Redis·AI 사용량 및 긴급 공지 관리"
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={overview.mode.production ? "default" : "secondary"}>
          {overview.mode.production ? "정식 배포 모드" : "Pilot 모드"}
        </Badge>
        {overview.mode.pilotEnv && <Badge variant="outline">PILOT_MODE=true</Badge>}
        {overview.mode.demoSeed && (
          <Badge variant="outline" className="border-amber-500 text-amber-700">
            RUN_DEMO_SEED=true
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Server}
          label="활성 사용자"
          value={`${overview.counts.activeUsers} / ${overview.counts.users}`}
        />
        <StatCard
          icon={Database}
          label="DB 용량"
          value={overview.database.sizeHuman}
        />
        <StatCard
          icon={Activity}
          label="AI 이벤트 (24h)"
          value={String(overview.ai.chatEvents24h)}
        />
        <StatCard
          icon={HardDrive}
          label="Redis"
          value={
            overview.redis.connected
              ? `${overview.redis.memoryHuman ?? "?"} · ${overview.redis.keys ?? 0} keys`
              : "미연결"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              런타임 · 컨테이너
            </CardTitle>
            <CardDescription>
              호스트에서 docker compose ps 로 컨테이너 상태를 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Node 환경" value={overview.runtime.nodeEnv} />
            <Row label="프로세스 uptime" value={formatUptime(overview.runtime.uptimeSec)} />
            <Row label="컨테이너 hostname" value={overview.runtime.hostname} />
            <Row label="게시글" value={`${overview.counts.posts} (데모 ${overview.counts.demoPosts})`} />
            <Row label="전자결재" value={String(overview.counts.approvals)} />
            <Row label="에러 (24h)" value={String(overview.monitoring.errors24h)} />
            <Row label="AI (7d)" value={String(overview.ai.chatEvents7d)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 시스템 에러</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <p className="text-sm text-muted-foreground">최근 24시간 에러 없음</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {errors.map((e: { id: string; source: string; message: string }) => (
                  <li key={e.id} className="rounded border p-2">
                    <p className="font-medium">{e.source}</p>
                    <p className="text-muted-foreground line-clamp-2">{e.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <SystemAdminPanel
        demoPostCount={overview.counts.demoPosts}
        productionMode={isProductionMode()}
        demoSeedEnabled={isDemoSeedEnabled()}
        recentNotices={notices}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">백업 자동화</CardTitle>
          <CardDescription>
            매일 02:00 DB · 03:00 uploads — scripts/backup/daily-backup.sh (DEPLOY.md §8, §15)
          </CardDescription>
        </CardHeader>
        <CardContent className="font-mono text-xs text-muted-foreground">
          <p>0 2 * * * /path/to/intranet-part1/scripts/backup/daily-backup.sh</p>
          <p className="mt-2">docker compose exec — intranet-db, intranet-nginx, intranet-app 확인</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <Icon className="h-8 w-8 text-primary/70" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
