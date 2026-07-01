import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import type { ResolvedCompanyTheme } from "@/features/company-theme/types";

interface CompanyPortalHubProps {
  theme: ResolvedCompanyTheme;
}

export function CompanyPortalHub({ theme }: CompanyPortalHubProps) {
  const cards = theme.portalCards;
  if (!cards?.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="b2b-section-eyebrow">Portal</p>
          <h2 className="text-lg font-semibold tracking-tight">업무 바로가기</h2>
          <p className="mt-1 text-sm text-muted-foreground">{theme.subTagline}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
          >
            {card.imageSrc && (
              <div className="relative h-24 overflow-hidden bg-muted">
                <Image
                  src={card.imageSrc}
                  alt=""
                  fill
                  className="object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              </div>
            )}
            <div className="p-4">
              <p className="font-semibold tracking-tight">{card.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Discover
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {theme.contact && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {theme.contact.label}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">{theme.contact.phone}</p>
              {theme.contact.note && (
                <p className="text-sm text-muted-foreground">{theme.contact.note}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground sm:text-right">
            상담시간 {theme.contact.hours}
          </p>
        </div>
      )}
    </section>
  );
}
