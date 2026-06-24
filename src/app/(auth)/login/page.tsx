import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "로그인",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-bold tracking-tight">인트라넷 포털</h1>
          <p className="text-sm text-muted-foreground">
            계정으로 로그인하세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              사내 계정 이메일과 비밀번호를 입력하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>

        <div className="mt-4 rounded-md border bg-background p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">데모 계정 (seed)</p>
          <ul className="mt-1 space-y-0.5">
            <li>admin@intranet.local · 관리자</li>
            <li>hq@intranet.local · 본사</li>
            <li>dealer@intranet.local · 대리점</li>
            <li>비밀번호: password1234</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
