import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { getMyProfile } from "@/features/messenger/service";
import { listJobCategories } from "@/features/jobs/service";
import { MessengerProfileForm } from "@/features/messenger/components/messenger-profile-form";

export const metadata: Metadata = { title: "메신저 회원 설정" };

export default async function MessengerProfilePage() {
  const user = await requireUser();
  const [me, jobs] = await Promise.all([getMyProfile(user.id), listJobCategories()]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="메신저 회원 설정"
        description="사진, 근무지, 업무, 직책, 직급, 입사일을 등록하면 다른 회원이 볼 수 있습니다. 로그인 상태는 접속 중에만 녹색으로 표시됩니다."
      />
      <div className="rounded-xl border p-4">
        <MessengerProfileForm
          userId={user.id}
          profile={me?.messengerProfile ?? null}
          jobs={jobs}
          selectedJobIds={me?.jobs.map((j) => j.jobCategory.id) ?? []}
        />
      </div>
    </div>
  );
}
