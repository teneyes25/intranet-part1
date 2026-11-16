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
import { SignupForm } from "@/features/auth/components/signup-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "회원가입",
};

export default async function SignupPage() {
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
          <h1 className="text-xl font-bold tracking-tight">계정 만들기</h1>
          <p className="text-sm text-muted-foreground">
            인트라넷 포털 계정을 생성합니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
            <CardDescription>
              이름·이메일·비밀번호만 입력하면 됩니다. 관리자 승인 후
              로그인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
