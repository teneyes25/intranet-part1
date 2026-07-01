import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/layout/auth-shell";
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
    <AuthShell
      title="로그인"
      subtitle="사내 계정 이메일과 비밀번호를 입력하세요."
      footer={
        <>
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </>
      }
      demoHint={
        <>
          <p className="font-semibold text-foreground">데모 계정 (seed)</p>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="font-medium text-foreground/80">admin@intranet.local</span>{" "}
              · 관리자
            </li>
            <li>
              <span className="font-medium text-foreground/80">hq@intranet.local</span> · 본사
            </li>
            <li>
              <span className="font-medium text-foreground/80">dealer@intranet.local</span> ·
              대리점
            </li>
            <li className="pt-1 text-muted-foreground">비밀번호: password1234</li>
          </ul>
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
