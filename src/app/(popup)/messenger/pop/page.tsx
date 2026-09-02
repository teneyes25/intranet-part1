import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/session";
import { loadMessengerBootstrap } from "@/features/messenger/actions";
import { MessengerApp } from "@/features/messenger/components/messenger-app";

export const metadata: Metadata = { title: "사내 메신저" };

export default async function MessengerPopupPage() {
  const user = await requireUser();
  const data = await loadMessengerBootstrap();

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b bg-[#F7F8F6] px-3 py-1.5">
        <p className="text-sm font-semibold">사내 메신저</p>
        <p className="truncate text-[11px] text-muted-foreground">
          왼쪽에서 상대를 찾으세요 · 파일 3개/10MB · 1년 보관
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <MessengerApp
          meId={user.id}
          directory={data.directory}
          rooms={data.rooms}
          variant="window"
        />
      </div>
    </div>
  );
}
