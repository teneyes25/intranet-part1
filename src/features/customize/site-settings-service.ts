import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayoutConfig,
} from "@/features/customize/types";

export async function getSiteSettings() {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    return prisma.siteSettings.create({
      data: { id: "default", appName: "Intranet" },
    });
  }
  return row;
}

export function parseDashboardLayout(raw: unknown): DashboardLayoutConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_DASHBOARD_LAYOUT;
  const o = raw as DashboardLayoutConfig;
  if (!Array.isArray(o.widgets)) return DEFAULT_DASHBOARD_LAYOUT;
  return {
    showBanner: o.showBanner ?? true,
    widgets: o.widgets.length > 0 ? o.widgets : DEFAULT_DASHBOARD_LAYOUT.widgets,
  };
}

export async function updateSiteSettings(data: {
  appName?: string;
  primaryColor?: string;
  sidebarColor?: string;
  sidebarForeground?: string;
  dashboardLayout?: DashboardLayoutConfig;
  logoStorageKey?: string | null;
  faviconStorageKey?: string | null;
  bannerStorageKey?: string | null;
  bannerMediaType?: string | null;
  updatedById: string;
}) {
  return prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      appName: data.appName ?? "Intranet",
      primaryColor: data.primaryColor ?? "222.2 47.4% 11.2%",
      sidebarColor: data.sidebarColor ?? "222.2 47.4% 11.2%",
      sidebarForeground: data.sidebarForeground ?? "210 40% 98%",
      dashboardLayout: (data.dashboardLayout ??
        DEFAULT_DASHBOARD_LAYOUT) as object,
      logoStorageKey: data.logoStorageKey,
      faviconStorageKey: data.faviconStorageKey,
      bannerStorageKey: data.bannerStorageKey,
      bannerMediaType: data.bannerMediaType,
      updatedById: data.updatedById,
    },
    update: {
      ...(data.appName !== undefined && { appName: data.appName }),
      ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
      ...(data.sidebarColor !== undefined && { sidebarColor: data.sidebarColor }),
      ...(data.sidebarForeground !== undefined && {
        sidebarForeground: data.sidebarForeground,
      }),
      ...(data.dashboardLayout !== undefined && {
        dashboardLayout: data.dashboardLayout as object,
      }),
      ...(data.logoStorageKey !== undefined && { logoStorageKey: data.logoStorageKey }),
      ...(data.faviconStorageKey !== undefined && {
        faviconStorageKey: data.faviconStorageKey,
      }),
      ...(data.bannerStorageKey !== undefined && {
        bannerStorageKey: data.bannerStorageKey,
      }),
      ...(data.bannerMediaType !== undefined && {
        bannerMediaType: data.bannerMediaType,
      }),
      updatedById: data.updatedById,
    },
  });
}
