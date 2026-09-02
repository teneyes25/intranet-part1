import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { MessengerLaunchClient } from "@/features/messenger/components/messenger-launch-client";

export const metadata: Metadata = { title: "사내 메신저" };

export default function MessengerPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="사내 메신저"
        description="작은 새 창에서 대화합니다. 대화는 1년간 보관되며 파일은 메시지당 최대 3개, 각 10MB입니다."
      />
      <MessengerLaunchClient />
    </div>
  );
}
