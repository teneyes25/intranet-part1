"use client";

import Link from "next/link";
import { Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { BrandingConfig } from "@/components/branding/branding-head";
import type { NavBoard } from "@/config/navigation";
import type { Role } from "@/lib/auth/roles";

interface SidebarContentProps {
  role: Role | undefined;
  boards?: NavBoard[];
  branding?: BrandingConfig;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function SidebarContent({
  role,
  boards = [],
  branding,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 overflow-hidden"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary/15 ring-1 ring-sidebar-primary/20">
            {branding?.logoStorageKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/branding/asset?asset=logo"
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </span>
          {!collapsed && (
            <span className="truncate text-base font-semibold tracking-tight">
              {branding?.appName ?? "Intranet"}
            </span>
          )}
        </Link>
        {onToggleCollapse && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="사이드바 접기"
            className="hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        )}
      </div>

      <SidebarNav
        role={role}
        boards={boards}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />

      <div className="border-t border-sidebar-border p-2">
        {onToggleCollapse && collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label="사이드바 펼치기"
            className="mx-auto hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        ) : (
          !collapsed && (
            <p className="px-3 py-1 text-xs text-sidebar-foreground/40">
              intranet-part1 · v0.1.0
            </p>
          )
        )}
      </div>
    </div>
  );
}
