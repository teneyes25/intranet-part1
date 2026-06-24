import "server-only";

import type { SiteSettings } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/features/customize/site-settings-service";

export interface EffectiveBranding {
  appName: string;
  logoStorageKey: string | null;
  bannerStorageKey: string | null;
  bannerMediaType: string | null;
  primaryColor: string;
  sidebarColor: string;
  sidebarForeground: string;
  dealerId: string | null;
  dealerLogoStorageKey: string | null;
}

export async function getEffectiveBranding(dealerId: string | null): Promise<EffectiveBranding> {
  const site = await getSiteSettings();
  if (!dealerId) {
    return mergeBranding(site, null);
  }
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  return mergeBranding(site, dealer);
}

function mergeBranding(
  site: SiteSettings,
  dealer: {
    id: string;
    appNameOverride: string | null;
    logoStorageKey: string | null;
    primaryColor: string | null;
    sidebarColor: string | null;
    sidebarForeground: string | null;
  } | null,
): EffectiveBranding {
  return {
    appName: dealer?.appNameOverride ?? site.appName,
    logoStorageKey: dealer?.logoStorageKey ?? site.logoStorageKey,
    bannerStorageKey: site.bannerStorageKey,
    bannerMediaType: site.bannerMediaType,
    primaryColor: dealer?.primaryColor ?? site.primaryColor,
    sidebarColor: dealer?.sidebarColor ?? site.sidebarColor,
    sidebarForeground: dealer?.sidebarForeground ?? site.sidebarForeground,
    dealerId: dealer?.id ?? null,
    dealerLogoStorageKey: dealer?.logoStorageKey ?? null,
  };
}

export function brandingStylesCss(branding: EffectiveBranding): string {
  return `
    :root {
      --primary: ${branding.primaryColor};
      --sidebar: ${branding.sidebarColor};
      --sidebar-foreground: ${branding.sidebarForeground};
    }
  `;
}
