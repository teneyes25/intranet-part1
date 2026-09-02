import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { loadMessengerBootstrap } from "@/features/messenger/actions";
import { MessengerApp } from "@/features/messenger/components/messenger-app";

export const metadata: Metadata = { title: "사내 메신저" };

export default async function MessengerPage() {
  const user = await requireUser();
  const data = await loadMessengerBootstrap();

  return (
    <div className="space-y-4">
      <PageHeader
        title="사내 메신저"
        description="로그인 중인 회원과 대화·파일을 주고받습니다. 대화는 1년간 보관됩니다. 파일은 메시지당 최대 3개, 각 10MB입니다."
      />
      <div className="h-[min(720px,70vh)] overflow-hidden rounded-xl border">
        <MessengerApp
          meId={user.id}
          directory={data.directory}
          rooms={data.rooms}
        />
      </div>
    </div>
  );
}
