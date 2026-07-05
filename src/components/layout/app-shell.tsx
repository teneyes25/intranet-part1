"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SkipToContent } from "@/components/layout/skip-to-content";
import { SidebarContent } from "@/components/layout/sidebar-content";
import { Topbar } from "@/components/layout/topbar";
import { PilotBanner } from "@/components/pilot/pilot-banner";
import { EmergencyBanner } from "@/components/emergency/emergency-banner";
import type { BrandingConfig } from "@/components/branding/branding-head";
import type { PilotBannerConfig } from "@/features/pilot/types";
import type { Role } from "@/lib/auth/roles";

const STORAGE_KEY = "intranet:sidebar-collapsed";

interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  branding?: BrandingConfig;
  pilotBanner?: PilotBannerConfig;
  emergencyNotice?: {
    id: string;
    title: string;
    body: string;
    isAdmin: boolean;
  } | null;
  children: React.ReactNode;
}

export function AppShell({ user, branding, pilotBanner, emergencyNotice, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex min-h-screen">
      <SkipToContent />
      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          "app-sidebar sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border/80 shadow-elevated transition-[width] duration-300 ease-out md:block",
          collapsed ? "w-[72px]" : "w-[17rem]",
        )}
      >
        <SidebarContent
          role={user.role}
          branding={branding}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {/* 모바일 드로어 */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="app-sidebar w-72 border-sidebar-border/80 p-0"
          autoFocusSelector='.app-sidebar a[href], .app-sidebar button:not([aria-label="메뉴 접기"])'
          restoreFocusRef={menuButtonRef}
        >
          <SheetTitle className="sr-only">메뉴</SheetTitle>
          <SidebarContent
            role={user.role}
            branding={branding}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} menuButtonRef={menuButtonRef} onMenuClick={() => setMobileOpen(true)} />
        <main id="main-content" className="app-main safe-pb" tabIndex={-1}>
          <div className="app-main-inner">
            {emergencyNotice && (
              <EmergencyBanner
                noticeId={emergencyNotice.id}
                title={emergencyNotice.title}
                body={emergencyNotice.body}
                isAdmin={emergencyNotice.isAdmin}
              />
            )}
            {pilotBanner && <PilotBanner config={pilotBanner} />}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
