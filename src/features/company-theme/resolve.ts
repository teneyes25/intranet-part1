import type { CompanyThemeConfig, ResolvedCompanyTheme } from "@/features/company-theme/types";
import {
  getCompanyThemePreset,
} from "@/features/company-theme/registry";

export function parseCompanyThemeConfig(raw: unknown): CompanyThemeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as CompanyThemeConfig;
  if (typeof o.enabled !== "boolean" || typeof o.presetId !== "string") return null;
  return {
    enabled: o.enabled,
    presetId: o.presetId,
    overrides: o.overrides,
  };
}

export function resolveCompanyTheme(
  config: CompanyThemeConfig | null | undefined,
): ResolvedCompanyTheme | null {
  if (!config?.enabled) return null;

  const preset = getCompanyThemePreset(config.presetId);
  if (!preset) return null;

  const overrides = config.overrides;

  return {
    ...preset,
    tagline: overrides?.tagline ?? preset.tagline,
    subTagline: overrides?.subTagline ?? preset.subTagline,
    heroSlides: overrides?.heroSlides ?? preset.heroSlides,
    portalCards: overrides?.portalCards ?? preset.portalCards,
    config,
  };
}
