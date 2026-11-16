"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/sidebar-content";
import { Topbar } from "@/components/layout/topbar";
import { EmergencyBanner } from "@/components/emergency/emergency-banner";
import type { BrandingConfig } from "@/components/branding/branding-head";
import type { Role } from "@/lib/auth/roles";

const STORAGE_KEY = "intranet:sidebar-collapsed";

interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  branding?: BrandingConfig;
  emergencyNotice?: {
    id: string;
    title: string;
    body: string;
    isAdmin: boolean;
  } | null;
  children: React.ReactNode;
}

export function AppShell({ user, branding, emergencyNotice, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-elevated transition-[width] duration-300 ease-out md:block",
          collapsed ? "w-[72px]" : "w-64",
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
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
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
        <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-muted/20 p-4 md:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {emergencyNotice && (
              <EmergencyBanner
                noticeId={emergencyNotice.id}
                title={emergencyNotice.title}
                body={emergencyNotice.body}
                isAdmin={emergencyNotice.isAdmin}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
