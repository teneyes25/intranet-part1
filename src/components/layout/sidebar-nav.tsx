"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getVisibleNavGroups, type NavItem } from "@/config/navigation";
import type { Role } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps {
  role: Role | undefined;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();
  const groups = getVisibleNavGroups(role);

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActiveHref(pathname, item.href);
            return (
              <NavLink
                key={item.href}
                item={item}
                active={active}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const linkClasses = cn(
    "group relative flex items-center rounded-md text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
    active && "bg-sidebar-accent text-sidebar-foreground",
    collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2",
  );

  const link = (
    <Link href={item.href} onClick={onNavigate} className={linkClasses}>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
      {!collapsed && item.badge ? (
        <Badge
          variant="secondary"
          className="h-5 min-w-5 justify-center px-1.5 text-[11px]"
        >
          {item.badge}
        </Badge>
      ) : null}
      {collapsed && item.badge ? (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.title}
        {item.badge ? ` (${item.badge})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
