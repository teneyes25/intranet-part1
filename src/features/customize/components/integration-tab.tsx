"use client";

import type { IntegrationSetting } from "@prisma/client";
import { useTransition } from "react";
import { Instagram, Globe, Megaphone } from "lucide-react";
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
import { saveIntegrationAction } from "@/features/customize/actions";

const ICONS: Record<string, typeof Globe> = {
  instagram: Instagram,
  company_web: Globe,
};

export function IntegrationTab({
  integrations,
}: {
  integrations: IntegrationSetting[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            공지 자동 게시 (Phase 2 예정)
          </CardTitle>
          <CardDescription>
            Instagram·회사 홈페이지 연동 후 공지사항 자동 게시 기능이 추가됩니다.
            아래에서 API Key/Token을 미리 저장할 수 있습니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {integrations.map((item) => {
        const Icon = ICONS[item.provider] ?? Globe;
        return (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" />
                {item.displayName}
                {item.isEnabled && (
                  <Badge variant="secondary">활성</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={(fd) => {
                  fd.set("provider", item.provider);
                  startTransition(async () => {
                    const r = await saveIntegrationAction(fd);
                    if (r.error) toast.error(r.error);
                    else toast.success("연동 설정이 저장되었습니다.");
                  });
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    name="apiKey"
                    type="password"
                    autoComplete="new-password"
                    placeholder={item.apiKey ? "●●●●●●●● (저장됨 — 변경 시에만 입력)" : "API Key 입력"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    name="apiSecret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={item.apiSecret ? "●●●●●●●● (저장됨 — 변경 시에만 입력)" : "API Secret 입력"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <Input
                    name="accessToken"
                    type="password"
                    autoComplete="new-password"
                    placeholder={item.accessToken ? "●●●●●●●● (저장됨 — 변경 시에만 입력)" : "Access Token 입력"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    name="webhookUrl"
                    defaultValue={item.webhookUrl ?? ""}
                    placeholder="https://..."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="isEnabled"
                    defaultChecked={item.isEnabled}
                  />
                  연동 활성화 (Phase 2에서 사용)
                </label>
                <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
                  저장
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
