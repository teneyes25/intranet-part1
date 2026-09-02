import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth/session";
import { getMyProfile } from "@/features/messenger/service";
import { listJobCategories } from "@/features/jobs/service";
import { MessengerProfileForm } from "@/features/messenger/components/messenger-profile-form";

export const metadata: Metadata = { title: "메신저 회원 설정" };

export default async function MessengerPopupProfilePage() {
  const user = await requireUser();
  const [me, jobs] = await Promise.all([getMyProfile(user.id), listJobCategories()]);

  return (
    <div className="h-screen overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">회원 설정</p>
        <Link href="/messenger/pop" className="text-xs underline">
          대화로 돌아가기
        </Link>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        사진·근무지·업무·직책·직급·입사일은 왼쪽 목록에 이름(직책/업무)으로 보입니다.
      </p>
      <MessengerProfileForm
        userId={user.id}
        profile={me?.messengerProfile ?? null}
        jobs={jobs}
        selectedJobIds={me?.jobs.map((j) => j.jobCategory.id) ?? []}
      />
    </div>
  );
}
