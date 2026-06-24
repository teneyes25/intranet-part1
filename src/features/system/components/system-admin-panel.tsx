"use client";

import { useActionState, useTransition } from "react";
import { AlertTriangle, Loader2, Megaphone, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deactivateEmergencyNoticeAction,
  purgeDemoDataAction,
  sendEmergencyNoticeAction,
  type EmergencyNoticeState,
} from "@/features/system/actions";

interface SystemAdminPanelProps {
  demoPostCount: number;
  productionMode: boolean;
  demoSeedEnabled: boolean;
  recentNotices: {
    id: string;
    title: string;
    recipientCount: number;
    isActive: boolean;
    createdAt: Date;
  }[];
}

const initialEmergency: EmergencyNoticeState = {};

export function SystemAdminPanel({
  demoPostCount,
  productionMode,
  demoSeedEnabled,
  recentNotices,
}: SystemAdminPanelProps) {
  const [emergencyState, emergencyAction, emergencyPending] = useActionState(
    sendEmergencyNoticeAction,
    initialEmergency,
  );
  const [purgePending, startPurge] = useTransition();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            긴급 공지 발송
          </CardTitle>
          <CardDescription>
            전체 활성 사용자에게 알림과 상단 배너를 동시에 표시합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={emergencyAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">내용</Label>
              <Textarea id="body" name="body" required rows={4} maxLength={2000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresHours">자동 해제 (시간, 0=무기한)</Label>
              <Input id="expiresHours" name="expiresHours" type="number" min={0} max={168} defaultValue={24} />
            </div>
            {emergencyState.error && (
              <p className="text-sm text-destructive">{emergencyState.error}</p>
            )}
            {emergencyState.ok && (
              <p className="text-sm text-emerald-600">
                {emergencyState.recipientCount}명에게 발송되었습니다.
              </p>
            )}
            <Button type="submit" disabled={emergencyPending}>
              {emergencyPending && <Loader2 className="h-4 w-4 animate-spin" />}
              긴급 공지 발송
            </Button>
          </form>
          {recentNotices.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {recentNotices.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 rounded border p-2">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.recipientCount}명 · {new Date(n.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  {n.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void deactivateEmergencyNoticeAction(n.id)}
                    >
                      해제
                    </Button>
                  )}
                  {!n.isActive && <Badge variant="secondary">종료</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {productionMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4" />
              데모 데이터 (관리자 전용)
            </CardTitle>
            <CardDescription>
              Pilot 데모 콘텐츠 {demoPostCount}건. RUN_DEMO_SEED=
              {demoSeedEnabled ? "true" : "false"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              정식 배포 후 일반 사용자에게는 데모 게시물이 숨겨집니다. 필요 시 아래에서
              영구 삭제하세요.
            </p>
            <Button
              variant="destructive"
              size="sm"
              disabled={purgePending || demoPostCount === 0}
              onClick={() =>
                startPurge(async () => {
                  await purgeDemoDataAction();
                })
              }
            >
              {purgePending && <Loader2 className="h-4 w-4 animate-spin" />}
              데모 데이터 삭제
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
