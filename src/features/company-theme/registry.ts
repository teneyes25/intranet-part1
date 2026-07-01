import type { CompanyThemePreset } from "@/features/company-theme/types";
import { FRENCH_MAISON_PRESET } from "@/features/company-theme/presets/french-maison";

const PRESET_MAP: Record<string, CompanyThemePreset> = {
  [FRENCH_MAISON_PRESET.id]: FRENCH_MAISON_PRESET,
};

/** 런타임에 다른 회사 프리셋 등록 (import-profile 결과) */
export function registerCompanyThemePreset(preset: CompanyThemePreset): void {
  PRESET_MAP[preset.id] = preset;
}

export function getCompanyThemePreset(id: string): CompanyThemePreset | null {
  return PRESET_MAP[id] ?? null;
}

export function listCompanyThemePresets(): CompanyThemePreset[] {
  return Object.values(PRESET_MAP);
}

export const DEFAULT_COMPANY_THEME_PRESET_ID = FRENCH_MAISON_PRESET.id;
