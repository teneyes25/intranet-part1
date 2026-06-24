import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "내 설정",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const preferences = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  return (
    <div>
      <PageHeader
        title="내 설정"
        description="프로필, 알림, 언어 설정을 관리합니다."
      />
      <SettingsForm user={user} preferences={preferences} />
    </div>
  );
}
