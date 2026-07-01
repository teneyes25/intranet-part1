import type { ResolvedCompanyTheme } from "@/features/company-theme/types";
import { companyThemeCss } from "@/features/company-theme/theme-css";

interface CompanyThemeStylesProps {
  theme: ResolvedCompanyTheme;
}

/** 회사 테마 색상을 CSS 변수로 주입 (기존 BrandingStyles와 병행) */
export function CompanyThemeStyles({ theme }: CompanyThemeStylesProps) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: companyThemeCss(theme),
      }}
    />
  );
}
