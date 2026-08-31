import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { listNotifications } from "@/features/notifications/service";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "알림",
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, 80);

  return (
    <div>
      <PageHeader
        title="알림"
        description="확인한 알림은 벨·사이드바에서 숨겨집니다. 이 목록에서 다시 확인할 수 있습니다."
      />
      <NotificationList items={items} />
    </div>
  );
}
