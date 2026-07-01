import "server-only";

import { getSiteSettings, parsePageBuilderConfig } from "@/features/customize/site-settings-service";
import { parseCompanyThemeConfig, resolveCompanyTheme } from "@/features/company-theme/resolve";
import type { ResolvedCompanyTheme } from "@/features/company-theme/types";

export async function getResolvedCompanyTheme(): Promise<ResolvedCompanyTheme | null> {
  const settings = await getSiteSettings();
  const pageBuilder = parsePageBuilderConfig(settings.pageBuilderConfig);
  const config = parseCompanyThemeConfig(pageBuilder.companyTheme);
  return resolveCompanyTheme(config);
}
