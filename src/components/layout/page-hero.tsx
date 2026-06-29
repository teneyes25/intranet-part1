import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  description?: string;
  eyebrow?: string;
  badge?: string;
  children?: React.ReactNode;
  variant?: "default" | "plain";
  className?: string;
}

export function PageHero({
  title,
  description,
  eyebrow,
  badge,
  children,
  variant = "default",
  className,
}: PageHeroProps) {
  if (variant === "plain") {
    return (
      <div className={cn("space-y-2", className)}>
        {eyebrow && <p className="b2b-section-eyebrow">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-foreground">{title}</h1>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={cn("b2b-page-hero", className)}>
      <div className="relative z-10 space-y-3">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-light">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-balance text-white">{title}</h1>
          {badge && (
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
            {description}
          </p>
        )}
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
}
