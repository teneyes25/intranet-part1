import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ChangePasswordForm } from "@/features/auth/change-password/change-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "비밀번호 변경",
};

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader
        title="비밀번호 변경"
        description={
          user.mustChangePassword
            ? "최초 로그인 또는 관리자 초기화 후 비밀번호 변경이 필요합니다."
            : "계정 보안을 위해 비밀번호를 변경합니다."
        }
      />
      <ChangePasswordForm forced={user.mustChangePassword} />
    </div>
  );
}
