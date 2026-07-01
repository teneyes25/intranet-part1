import type { CompanyThemePreset } from "@/features/company-theme/types";

/**
 * French Maison (프렌치메종) 공식 홈페이지 디자인 요소 반영
 * @see http://frenchmaison.co.kr/default/index.php
 */
export const FRENCH_MAISON_PRESET: CompanyThemePreset = {
  id: "french-maison",
  label: "프렌치메종",
  description:
    "French Maison 공식 홈페이지 — Romantic & Modern & Classic, 울 스토리 브랜드 라인",
  sourceUrl: "http://frenchmaison.co.kr/default/index.php",
  companyName: "French Maison",
  companyNameKo: "프렌치메종",
  tagline: "Romantic & Modern & Classic",
  subTagline: "제품은 침구문화를 창조합니다",
  logoPath: "/company-themes/french-maison/logo.svg",
  colors: {
    primary: "10 32% 38%",
    primaryForeground: "40 33% 97%",
    accent: "38 42% 58%",
    background: "40 28% 97%",
    foreground: "25 18% 16%",
    heroFrom: "25 22% 14%",
    heroVia: "10 28% 22%",
    heroTo: "38 20% 28%",
    sidebar: "25 22% 14%",
    sidebarForeground: "40 28% 96%",
  },
  heroSlides: [
    {
      id: "wool-story",
      eyebrow: "WOOL STORY",
      title: "울 스토리",
      subtitle: "프리미엄 울 침구로 완성하는 감성 침실",
      imageSrc: "/company-themes/french-maison/hero-1.svg",
      imageAlt: "프렌치메종 울 스토리 침구",
      ctaLabel: "울 스토리 보기",
      ctaHref: "/boards/products",
    },
    {
      id: "romantic",
      eyebrow: "French Maison",
      title: "Romantic & Modern & Classic",
      subtitle: "낭만과 모던, 클래식이 어우러진 프렌치메종만의 스타일",
      imageSrc: "/company-themes/french-maison/hero-2.svg",
      imageAlt: "프렌치메종 라이프스타일",
      ctaLabel: "회사 소개",
      ctaHref: "/boards/notices",
    },
    {
      id: "premium-bedding",
      eyebrow: "PRODUCT",
      title: "프리미엄 침구 컬렉션",
      subtitle: "이불 · 패드 · 스프레드 · 베개 — 기능에 맞는 사이즈 구성",
      imageSrc: "/company-themes/french-maison/hero-3.svg",
      imageAlt: "프렌치메종 제품",
      ctaLabel: "제품 게시판",
      ctaHref: "/boards/products",
    },
  ],
  brandLines: [
    {
      id: "fm",
      name: "French Maison",
      tagline: "프렌치메종",
      description: "낭만적이고 모던하며 클래식한 침구 브랜드",
      imageSrc: "/company-themes/french-maison/brand-fm.svg",
    },
    {
      id: "wool",
      name: "WOOL STORY",
      tagline: "울 스토리",
      description: "울의 이야기, 프리미엄 울 침구 라인",
      imageSrc: "/company-themes/french-maison/brand-wool.svg",
    },
  ],
  portalCards: [
    {
      id: "company",
      title: "회사소개",
      description: "프렌치메종 비전과 브랜드 스토리",
      href: "/boards/notices",
      imageSrc: "/company-themes/french-maison/card-company.svg",
    },
    {
      id: "products",
      title: "제품소개",
      description: "이불 · 패드 · 스프레드 · 베개 카탈로그",
      href: "/boards/products",
      imageSrc: "/company-themes/french-maison/card-product.svg",
    },
    {
      id: "agency",
      title: "대리점",
      description: "대리점 신청 및 운영 안내",
      href: "/dealer-portal",
      imageSrc: "/company-themes/french-maison/card-agency.svg",
    },
    {
      id: "customer",
      title: "고객센터",
      description: "공지사항 · Q&A · 문의",
      href: "/boards/notices",
      imageSrc: "/company-themes/french-maison/card-customer.svg",
    },
  ],
  contact: {
    label: "Call Center",
    phone: "02-407-7047",
    hours: "AM 09:30 ~ PM 05:30",
    note: "친절한 상담으로 도와드리겠습니다",
  },
};
