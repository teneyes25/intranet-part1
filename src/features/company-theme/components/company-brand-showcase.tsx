import Image from "next/image";

import type { ResolvedCompanyTheme } from "@/features/company-theme/types";

interface CompanyBrandShowcaseProps {
  theme: ResolvedCompanyTheme;
}

export function CompanyBrandShowcase({ theme }: CompanyBrandShowcaseProps) {
  const lines = theme.brandLines;
  if (!lines?.length) return null;

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {lines.map((line) => (
        <article
          key={line.id}
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all duration-300 hover:shadow-elevated"
        >
          {line.imageSrc && (
            <div className="relative h-32 w-full overflow-hidden bg-muted">
              <Image
                src={line.imageSrc}
                alt={line.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            </div>
          )}
          <div className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {line.name}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">{line.tagline}</h3>
            {line.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {line.description}
              </p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
