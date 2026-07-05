"use client";

import Link from "next/link";
import { Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { BrandingConfig } from "@/components/branding/branding-head";
import type { Role } from "@/lib/auth/roles";

interface SidebarContentProps {
  role: Role | undefined;
  branding?: BrandingConfig;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function SidebarContent({
  role,
  branding,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarContentProps) {
  const appName = branding?.appName ?? "Intranet";

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-[4.25rem] shrink-0 items-center border-b border-sidebar-border/80",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "group flex items-center overflow-hidden transition-opacity hover:opacity-90",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sidebar-primary/15 shadow-glow ring-1 ring-sidebar-primary/25 transition-transform group-hover:scale-[1.02]">
            {branding?.logoStorageKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/branding/asset?asset=logo"
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Building2 className="h-5 w-5 text-sidebar-primary" />
            )}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {appName}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/35">
                Workspace
              </p>
            </div>
          )}
        </Link>
        {onToggleCollapse && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="사이드바 접기"
            className="hidden h-8 w-8 text-sidebar-foreground/50 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground md:inline-flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SidebarNav role={role} collapsed={collapsed} onNavigate={onNavigate} />

      <div className="shrink-0 border-t border-sidebar-border/80 p-2">
        {onToggleCollapse && collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="사이드바 펼치기"
            className="mx-auto hidden h-9 w-9 text-sidebar-foreground/50 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground md:flex"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        ) : (
          !collapsed && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/30">
                Ten Eyes Intranet
              </p>
              <p className="mt-0.5 text-xs text-sidebar-foreground/45">v1.6.1 · Pilot Sprint #1</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
