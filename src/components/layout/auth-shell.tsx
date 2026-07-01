import Link from "next/link";
import Image from "next/image";
import { Building2, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

interface AuthShellBrand {
  name: string;
  tagline: string;
  subTagline?: string;
  logoSrc?: string;
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  demoHint?: React.ReactNode;
  brand?: AuthShellBrand;
}

const FEATURES = [
  { icon: ShieldCheck, label: "역할 기반 접근 제어" },
  { icon: Zap, label: "실시간 주문·재고 연동" },
  { icon: Sparkles, label: "페이지 빌더 커스터마이징" },
] as const;

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  demoHint,
  brand,
}: AuthShellProps) {
  const brandName = brand?.name ?? "인트라넷 포털";
  const brandTagline = brand?.tagline ?? "B2B 운영을 위한\n통합 업무 플랫폼";
  const brandDesc =
    brand?.subTagline ??
    "대리점 포털, 거래 모듈, 게시판·페이지 빌더를 하나의 워크스페이스에서 관리하세요.";

  return (
    <main className="auth-page-shell">
      <div className="auth-page-grid">
        {/* 브랜드 패널 — 데스크톱 */}
        <aside
          className={cn(
            "auth-brand-panel hidden lg:flex",
            brand && "auth-brand-panel-company",
          )}
        >
          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
            <div>
              <Link href="/login" className="inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 shadow-glow ring-1 ring-white/20 backdrop-blur">
                  {brand?.logoSrc ? (
                    <Image src={brand.logoSrc} alt="" width={44} height={44} className="object-contain p-1.5" />
                  ) : (
                    <Building2 className="h-6 w-6 text-white" />
                  )}
                </span>
                <span className="text-lg font-semibold tracking-tight text-white">
                  {brandName}
                </span>
              </Link>
              <p className="mt-8 max-w-sm whitespace-pre-line text-balance text-2xl font-bold leading-snug tracking-tight text-white xl:text-3xl">
                {brandTagline}
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
                {brandDesc}
              </p>
            </div>

            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 text-sm text-white/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-brand-light" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 폼 영역 */}
        <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-[420px]">
            {/* 모바일 로고 */}
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 shadow-glow ring-1 ring-primary/20">
                {brand?.logoSrc ? (
                  <Image src={brand.logoSrc} alt="" width={56} height={56} className="object-contain p-2" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className={cn("auth-form-card", "lg:mt-0")}>
              <div className="hidden border-b border-border/60 px-6 py-5 lg:block">
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </div>
              <div className="p-6">{children}</div>
            </div>

            {footer ? (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}

            {demoHint ? (
              <div className="auth-demo-hint mt-5">{demoHint}</div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
