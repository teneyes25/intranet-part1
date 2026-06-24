"use client";

import { CheckCircle2, Circle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ITEMS = [
  { label: "PILOT_MODE=true (.env.production)", hint: "Pilot 배포 시 활성화" },
  { label: "Pilot 그룹 멤버 지정", hint: "/admin/pilot → 그룹 관리" },
  { label: "데모 데이터 (RUN_DEMO_SEED)", hint: "Pilot 전용 — 정식 배포 시 /admin/system (ADMIN)" },
  { label: "DB 백업 스크립트 실행 확인", hint: "scripts/backup/postgres-backup.sh" },
  { label: "uploads 볼륨 백업 확인", hint: "scripts/backup/uploads-backup.sh" },
  { label: "Rollback 시나리오 문서 숙지", hint: "DEPLOY.md §6" },
  { label: "docker compose logs -f app 모니터링", hint: "성능·에러 확인" },
  { label: "npm run smoke / test:e2e 통과", hint: "배포 전 검증" },
];

export function PilotChecklistTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilot 배포 체크리스트</CardTitle>
        <CardDescription>
          본사 내부 Pilot 시작 전 아래 항목을 확인하세요. (수동 체크)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {ITEMS.map((item) => (
            <li key={item.label} className="flex items-start gap-3 text-sm">
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-muted-foreground">{item.hint}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          자동 검증: npm run pilot:check (스크립트)
        </p>
      </CardContent>
    </Card>
  );
}
