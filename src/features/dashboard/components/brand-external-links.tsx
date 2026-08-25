import { ExternalLink, Instagram, ShoppingBag } from "lucide-react";
import type { CSSProperties } from "react";

export const FRENCH_MAISON_HOME_URL = "http://www.frenchmaison.co.kr";
export const FRENCH_MAISON_INSTAGRAM_URL =
  "https://www.instagram.com/frenchmaison_official/";
export const FRENCH_MAISON_MALL_URL = "https://www.frenchmaisonmall.com/";

/** Official mall campaign imagery (Cafe24 CDN) */
const MALL_HERO_IMAGE =
  "https://file.cafe24cos.com/banner-admin-live/upload/frenchmaisonmall/f3f9e50d-932b-4728-a190-7467f94420af.jpeg";

/**
 * 메인 홈 — French Maison 브랜드 히어로 + 인스타/몰 바로가기
 */
export function BrandExternalLinks() {
  return (
    <section
      className="maison-hero relative -mx-4 overflow-hidden md:-mx-8"
      aria-label="French Maison 바로가기"
      style={
        {
          "--maison-ink": "#1C1F1D",
          "--maison-mist": "#E6EAE6",
          "--maison-sage": "#5C7358",
          "--maison-linen": "#F2F4F1",
          "--font-display": "var(--font-cormorant), Georgia, serif",
          "--font-body": "var(--font-manrope), system-ui, sans-serif",
        } as CSSProperties
      }
    >
      {/* Full-bleed visual plane */}
      <div className="relative min-h-[min(72vh,32rem)] w-full sm:min-h-[28rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MALL_HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-out hover:scale-[1.02]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(28,31,29,0.72) 0%, rgba(28,31,29,0.45) 42%, rgba(92,115,88,0.25) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative flex min-h-[min(72vh,32rem)] flex-col justify-between px-6 py-8 sm:min-h-[28rem] sm:px-10 sm:py-10 md:px-14">
          {/* Social / mall icon row */}
          <div className="flex flex-wrap items-center justify-end gap-2 animate-[maison-fade_0.8s_ease-out]">
            <a
              href={FRENCH_MAISON_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18"
              style={{ fontFamily: "var(--font-body)" }}
              aria-label="French Maison 인스타그램 새 창에서 열기"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white transition-transform duration-300 group-hover:scale-105">
                <Instagram className="h-4 w-4" aria-hidden />
              </span>
              <span className="hidden sm:inline">Instagram</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </a>
            <a
              href={FRENCH_MAISON_MALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/18"
              style={{ fontFamily: "var(--font-body)" }}
              aria-label="프렌치메종몰 새 창에서 열기"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md text-white transition-transform duration-300 group-hover:scale-105"
                style={{ background: "var(--maison-sage)" }}
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
              </span>
              <span className="hidden sm:inline">프렌치메종몰</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
            </a>
          </div>

          {/* Brand-first composition */}
          <div className="max-w-xl animate-[maison-rise_1s_ease-out]">
            <p
              className="text-[2.4rem] font-semibold leading-[1.05] tracking-[0.04em] text-white sm:text-5xl md:text-[3.4rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              French Maison
            </p>
            <p
              className="mt-3 max-w-md text-base leading-relaxed text-white/85 sm:text-lg"
              style={{ fontFamily: "var(--font-body)" }}
            >
              소재에 따라 달라지는 편안함 — 감각적인 프렌치 홈스타일
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={FRENCH_MAISON_MALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
                style={{
                  background: "var(--maison-sage)",
                  fontFamily: "var(--font-body)",
                }}
              >
                몰 둘러보기
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <a
                href={FRENCH_MAISON_HOME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-white/35 bg-transparent px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white/10"
                style={{ fontFamily: "var(--font-body)" }}
              >
                브랜드 홈
                <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary mall strip banner */}
      <a
        href={FRENCH_MAISON_MALL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-4 border-t px-6 py-3.5 transition-colors duration-300 sm:px-10 md:px-14"
        style={{
          background: "var(--maison-linen)",
          borderColor: "rgba(92,115,88,0.2)",
          fontFamily: "var(--font-body)",
        }}
        aria-label="프렌치메종몰 쇼핑몰 바로가기"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white transition-transform duration-300 group-hover:scale-105"
            style={{ background: "var(--maison-ink)" }}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span
              className="block text-sm font-semibold tracking-wide"
              style={{ color: "var(--maison-ink)", fontFamily: "var(--font-display)" }}
            >
              프렌치메종몰
            </span>
            <span className="block truncate text-xs" style={{ color: "#5A635C" }}>
              www.frenchmaisonmall.com · BEST &amp; MATERIAL EDIT
            </span>
          </span>
        </span>
        <span
          className="hidden shrink-0 text-xs font-medium uppercase tracking-[0.12em] transition-all duration-300 group-hover:translate-x-0.5 sm:inline"
          style={{ color: "var(--maison-sage)" }}
        >
          Shop now →
        </span>
      </a>

      <style>{`
        @keyframes maison-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes maison-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
