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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 via-brand-dark to-brand p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-elevated ring-1 ring-white/20 backdrop-blur">
            <Building2 className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">인트라넷 포털</h1>
          <p className="text-sm text-white/70">
            계정으로 로그인하세요
          </p>
        </div>

        <Card className="border-white/10 bg-white/95 shadow-elevated backdrop-blur">
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

        <p className="mt-4 text-center text-sm text-white/70">
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-white underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
