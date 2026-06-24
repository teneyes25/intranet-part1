import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PilotFeedbackForm } from "@/features/pilot/components/feedback-form";
import { isPilotUser } from "@/features/pilot/pilot-service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pilot 피드백",
};

export default async function FeedbackPage() {
  const user = await requireUser();
  const pilot = await isPilotUser(user.id);
  if (!pilot) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Pilot 피드백"
        description="Pilot 테스트 기간 중 불편한 점이나 개선 아이디어를 알려주세요."
      />
      <PilotFeedbackForm />
    </div>
  );
}
