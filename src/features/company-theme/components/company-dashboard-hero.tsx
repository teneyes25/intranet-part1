"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ResolvedCompanyTheme } from "@/features/company-theme/types";

interface CompanyDashboardHeroProps {
  theme: ResolvedCompanyTheme;
  userName: string;
  roleLabel: string;
  today: string;
}

export function CompanyDashboardHero({
  theme,
  userName,
  roleLabel,
  today,
}: CompanyDashboardHeroProps) {
  const slides = theme.heroSlides;
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0]!;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const c = theme.colors;

  return (
    <section
      className="company-hero relative overflow-hidden rounded-2xl border border-border/40 shadow-elevated"
      style={{
        background: `linear-gradient(135deg, hsl(${c.heroFrom}) 0%, hsl(${c.heroVia}) 50%, hsl(${c.heroTo}) 100%)`,
      }}
    >
      <div className="grid min-h-[280px] lg:grid-cols-2 lg:min-h-[320px]">
        <div className="relative z-10 flex flex-col justify-center p-6 md:p-8 lg:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            {theme.companyNameKo ?? theme.companyName} · Intranet
          </p>
          <p className="mt-2 text-sm text-white/70">{today}</p>
          <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
            안녕하세요, {userName}님
          </h1>
          <p className="mt-2 inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
            {roleLabel}
          </p>

          <div className="mt-6 space-y-2">
            {slide.eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                {slide.eyebrow}
              </p>
            )}
            <p className="text-lg font-semibold text-white md:text-xl">{slide.title}</p>
            {slide.subtitle && (
              <p className="max-w-md text-sm leading-relaxed text-white/75">{slide.subtitle}</p>
            )}
            {slide.ctaLabel && slide.ctaHref && (
              <Button asChild size="sm" className="mt-2 border-white/20 bg-white/15 text-white hover:bg-white/25">
                <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
              </Button>
            )}
          </div>

          {slides.length > 1 && (
            <div className="mt-6 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
                aria-label="이전 슬라이드"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`슬라이드 ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/35 hover:bg-white/55",
                    )}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setIndex((i) => (i + 1) % slides.length)}
                aria-label="다음 슬라이드"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="relative min-h-[200px] lg:min-h-0">
          <Image
            src={slide.imageSrc}
            alt={slide.imageAlt ?? slide.title}
            fill
            className="object-cover opacity-90"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent lg:from-black/40" />
          <p className="absolute bottom-4 right-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
            {theme.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
