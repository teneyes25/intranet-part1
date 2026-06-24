"use client";

import type { PilotSettings } from "@prisma/client";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { savePilotSettingsAction } from "@/features/pilot/actions";

export function PilotSettingsTab({
  settings,
  envActive,
}: {
  settings: PilotSettings;
  envActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilot 모드 설정</CardTitle>
        <CardDescription>
          PILOT_MODE 환경변수 또는 DB 활성화 시 Pilot 그룹 사용자에게 배너·피드백이 표시됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={envActive ? "default" : "secondary"}>
            ENV PILOT_MODE={envActive ? "true" : "false"}
          </Badge>
          <Badge variant={settings.isActive ? "default" : "secondary"}>
            DB isActive={settings.isActive ? "true" : "false"}
          </Badge>
        </div>
        <form
          action={(fd) =>
            startTransition(async () => {
              const r = await savePilotSettingsAction(fd);
              if (r && "error" in r && typeof r.error === "string") toast.error(r.error);
              else toast.success("Pilot 설정이 저장되었습니다.");
            })
          }
          className="space-y-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={settings.isActive} />
            DB Pilot 모드 활성화
          </label>
          <div className="space-y-2">
            <Label htmlFor="bannerTitle">배너 제목</Label>
            <Input id="bannerTitle" name="bannerTitle" defaultValue={settings.bannerTitle} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bannerMessage">안내 메시지</Label>
            <textarea
              id="bannerMessage"
              name="bannerMessage"
              defaultValue={settings.bannerMessage}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="feedbackEnabled"
              defaultChecked={settings.feedbackEnabled}
            />
            피드백 수집 활성화
          </label>
          <Button type="submit" disabled={pending}>
            저장
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
