import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { listNotifications } from "@/features/notifications/service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, 50);

  return (
    <div>
      <PageHeader
        title="알림"
        description="결재·댓글·공지·시스템 알림 — 클릭 시 해당 화면으로 이동합니다."
      />
      <NotificationsList items={items} />
    </div>
  );
}
