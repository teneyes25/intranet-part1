"use client";

import { useEffect, useActionState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert } from "lucide-react";

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
  changePasswordAction,
  type ChangePasswordState,
} from "@/features/auth/change-password/actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({ forced }: { forced?: boolean }) {
  const { update } = useSession();
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  useEffect(() => {
    if (state.ok) {
      void update({ mustChangePassword: false });
      if (forced) {
        window.location.href = "/dashboard";
      }
    }
  }, [state.ok, update, forced]);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {forced && <ShieldAlert className="h-4 w-4 text-amber-600" />}
          비밀번호 변경
        </CardTitle>
        <CardDescription>
          {forced
            ? "보안 정책에 따라 최초 로그인 시 비밀번호를 변경해야 합니다."
            : "주기적으로 비밀번호를 변경하는 것을 권장합니다."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            {state.fieldErrors?.currentPassword && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.currentPassword[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <p className="text-xs text-muted-foreground">
              10자 이상, 영문·숫자 포함
            </p>
            {state.fieldErrors?.newPassword && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.newPassword[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {state.fieldErrors?.confirmPassword && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.confirmPassword[0]}
              </p>
            )}
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.ok && !forced && (
            <p className="text-sm text-emerald-600">비밀번호가 변경되었습니다.</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            비밀번호 변경
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
