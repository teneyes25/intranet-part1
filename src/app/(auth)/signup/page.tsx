import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/layout/auth-shell";
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
    <AuthShell
      title="회원가입"
      subtitle="소속을 선택하고 정보를 입력하세요. 대리점은 발급받은 코드가 필요합니다."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
