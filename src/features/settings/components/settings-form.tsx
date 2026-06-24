"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfileAction } from "@/features/settings/actions";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/roles";

export function SettingsForm({
  user,
  preferences,
}: {
  user: { id: string; name?: string | null; email?: string | null; role: Role; dealerName?: string | null };
  preferences: { locale: string; bio: string | null; notifyPush: boolean; notifyEmail: boolean } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(preferences?.bio ?? "");
  const [locale, setLocale] = useState<Locale>((preferences?.locale as Locale) ?? "ko");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>표시 이름과 자기소개를 수정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">자기소개</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="팀, 담당 업무 등"
            />
          </div>
          <div className="space-y-2">
            <Label>언어 (i18n 준비)</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                  <SelectItem key={l} value={l}>
                    {LOCALE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await updateProfileAction({ name, bio, locale });
                if (r.error) toast.error(r.error);
                else toast.success("프로필이 저장되었습니다.");
              })
            }
          >
            저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-muted-foreground">이메일</span>
            <span className="font-medium">{user.email}</span>
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
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/settings/change-password">
              <KeyRound className="h-4 w-4" />
              비밀번호 변경
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
