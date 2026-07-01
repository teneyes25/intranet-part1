/**
 * 회사 홈페이지 디자인을 인트라넷에 이식하기 위한 프로필 스키마.
 * 프리셋 등록 또는 import-profile 로 다른 회사에 재사용합니다.
 */

export interface CompanyThemeColors {
  /** HSL components e.g. "217 91% 53%" */
  primary: string;
  primaryForeground: string;
  accent: string;
  background: string;
  foreground: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
  sidebar: string;
  sidebarForeground: string;
}

export interface CompanyThemeHeroSlide {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface CompanyThemeBrandLine {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  imageSrc?: string;
}

export interface CompanyThemePortalCard {
  id: string;
  title: string;
  description: string;
  href: string;
  imageSrc?: string;
}

export interface CompanyThemeContact {
  label: string;
  phone: string;
  hours: string;
  note?: string;
}

/** 홈페이지에서 추출·매핑 가능한 원본 메타 (수동 입력 또는 향후 스크래핑) */
export interface HomepageDesignProfile {
  sourceUrl?: string;
  companyName: string;
  companyNameKo?: string;
  tagline: string;
  subTagline?: string;
  colors: CompanyThemeColors;
  heroSlides: CompanyThemeHeroSlide[];
  brandLines?: CompanyThemeBrandLine[];
  portalCards?: CompanyThemePortalCard[];
  contact?: CompanyThemeContact;
  logoPath?: string;
}

export interface CompanyThemeOverrides {
  tagline?: string;
  subTagline?: string;
  heroSlides?: CompanyThemeHeroSlide[];
  portalCards?: CompanyThemePortalCard[];
}

export interface CompanyThemeConfig {
  enabled: boolean;
  presetId: string;
  overrides?: CompanyThemeOverrides;
}

export interface CompanyThemePreset extends HomepageDesignProfile {
  id: string;
  label: string;
  description: string;
}

export interface ResolvedCompanyTheme extends CompanyThemePreset {
  config: CompanyThemeConfig;
}
