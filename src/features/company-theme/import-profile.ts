import type {
  CompanyThemePreset,
  HomepageDesignProfile,
} from "@/features/company-theme/types";

/**
 * 다른 회사 홈페이지 디자인 메타를 프리셋으로 변환합니다.
 * (수동 매핑 · 관리자 JSON 입력 · 향후 URL 스크래핑 파이프라인 공통 진입점)
 */
export function buildPresetFromHomepageProfile(
  id: string,
  profile: HomepageDesignProfile,
  meta?: { label?: string; description?: string },
): CompanyThemePreset {
  return {
    id,
    label: meta?.label ?? profile.companyNameKo ?? profile.companyName,
    description:
      meta?.description ??
      (profile.sourceUrl
        ? `${profile.companyName} 홈페이지(${profile.sourceUrl}) 기반 테마`
        : `${profile.companyName} 커스텀 테마`),
    ...profile,
  };
}

export function validateHomepageDesignProfile(
  raw: unknown,
): raw is HomepageDesignProfile {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as HomepageDesignProfile;
  return (
    typeof p.companyName === "string" &&
    typeof p.tagline === "string" &&
    !!p.colors &&
    typeof p.colors.primary === "string" &&
    Array.isArray(p.heroSlides) &&
    p.heroSlides.length > 0
  );
}
