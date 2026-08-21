import { ExternalLink, Instagram } from "lucide-react";

export const FRENCH_MAISON_HOME_URL = "http://www.frenchmaison.co.kr";
export const FRENCH_MAISON_INSTAGRAM_URL =
  "https://www.instagram.com/frenchmaison_official/";

/**
 * 메인 홈 — 회사 홈페이지 배너 + 인스타그램 바로가기
 */
export function BrandExternalLinks() {
  return (
    <section className="space-y-3" aria-label="French Maison 바로가기">
      <div className="flex items-center justify-end gap-2">
        <a
          href={FRENCH_MAISON_INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
          aria-label="French Maison 인스타그램 새 창에서 열기"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
            <Instagram className="h-4 w-4" aria-hidden />
          </span>
          <span>Instagram</span>
          <ExternalLink
            className="h-3.5 w-3.5 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </a>
      </div>

      <a
        href={FRENCH_MAISON_HOME_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden rounded-2xl outline-none ring-offset-2 transition-transform duration-500 hover:scale-[1.005] focus-visible:ring-2 focus-visible:ring-[#C4A574]"
        aria-label="French Maison 홈페이지 새 창에서 열기"
      >
        <div
          className="relative min-h-[9.5rem] w-full sm:min-h-[11rem]"
          style={{
            background:
              "linear-gradient(118deg, #1A1520 0%, #2C2433 38%, #3D2F28 72%, #1F1A18 100%)",
          }}
        >
          {/* atmosphere */}
          <div
            className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full opacity-40 blur-3xl transition-opacity duration-700 group-hover:opacity-55"
            style={{ background: "radial-gradient(circle, #C4A574 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -right-10 bottom-0 h-40 w-56 rounded-full opacity-30 blur-3xl transition-opacity duration-700 group-hover:opacity-45"
            style={{ background: "radial-gradient(circle, #8B6B4A 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4A574' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative flex h-full min-h-[9.5rem] flex-col justify-center px-6 py-7 sm:min-h-[11rem] sm:px-10">
            <p
              className="font-serif text-[1.65rem] font-semibold tracking-[0.08em] text-[#F5EDE0] transition-transform duration-500 group-hover:translate-x-0.5 sm:text-3xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              French Maison
            </p>
            <p className="mt-1.5 max-w-md text-sm text-[#D4C4B0]/sm:text-[0.95rem]">
              공식 홈페이지에서 브랜드와 제품을 확인하세요
            </p>
            <span className="mt-4 inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#C4A574] transition-all duration-300 group-hover:gap-2.5">
              www.frenchmaison.co.kr
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </a>
    </section>
  );
}
