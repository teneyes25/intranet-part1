import type { Dealer } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function hslToCssColor(hsl: string | null | undefined, fallback: string): string {
  if (!hsl?.trim()) return fallback;
  if (hsl.startsWith("#") || hsl.startsWith("rgb")) return hsl;
  return `hsl(${hsl})`;
}

export function buildDealerThemeCanvasCss(dealer: Pick<Dealer, "name" | "primaryColor" | "sidebarColor">): string {
  const primary = hslToCssColor(dealer.primaryColor, "#2563EB");
  const sidebar = hslToCssColor(dealer.sidebarColor, "#0F172A");
  return `
    body { background: #F8FAFC; color: #0F172A; font-family: Pretendard, sans-serif; }
    .intranet-banner, .intranet-hero { background: linear-gradient(135deg, ${sidebar}, ${primary}) !important; }
    .intranet-btn, .intranet-hero-cta { background: ${primary} !important; }
    .intranet-ai { border-color: ${primary}33 !important; }
  `;
}

export async function syncDealerPageTheme(dealerId: string): Promise<void> {
  const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
  if (!dealer) return;

  const slug = `dealer-${dealer.code.toLowerCase()}`;
  const primary = hslToCssColor(dealer.primaryColor, "#2563EB");
  const sidebar = hslToCssColor(dealer.sidebarColor, "#0F172A");

  await prisma.pageTheme.upsert({
    where: { slug },
    create: {
      id: `pt_${dealer.id}`,
      slug,
      name: `${dealer.name} 브랜드`,
      description: `${dealer.code} 대리점 브랜딩 테마`,
      cssVars: {
        primary,
        accent: primary,
        background: "#F8FAFC",
        text: "#0F172A",
        sidebar,
      },
      canvasCss: buildDealerThemeCanvasCss(dealer),
      isDefault: false,
      dealerId: dealer.id,
    },
    update: {
      name: `${dealer.name} 브랜드`,
      cssVars: {
        primary,
        accent: primary,
        background: "#F8FAFC",
        text: "#0F172A",
        sidebar,
      },
      canvasCss: buildDealerThemeCanvasCss(dealer),
    },
  });

  await prisma.pageTemplate.upsert({
    where: { slug: `${slug}-welcome` },
    create: {
      id: `tpl_${dealer.id}_welcome`,
      slug: `${slug}-welcome`,
      name: `${dealer.name} 웰컴`,
      description: "대리점 브랜딩 Hero + 카드 그리드",
      category: "landing",
      targetSlug: "dashboard",
      thumbnail: "🏪",
      projectData: {},
      html: `
        <section class="intranet-hero" style="padding:48px 32px;background:linear-gradient(135deg,${sidebar},${primary});color:#fff;border-radius:16px;margin-bottom:20px;">
          <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">${dealer.name}</h1>
          <p style="margin:0;opacity:0.9;">대리점 포털 — 재고·주문·Rollout 정보</p>
        </section>
        <div class="intranet-card-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
          <article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
            <h3 style="margin:0 0 6px;">재고 현황</h3>
            <p style="margin:0;color:#64748B;font-size:0.875rem;">실시간 재고 조회</p>
          </article>
          <article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
            <h3 style="margin:0 0 6px;">주문 관리</h3>
            <p style="margin:0;color:#64748B;font-size:0.875rem;">발주·배송 추적</p>
          </article>
        </div>
      `,
      css: "",
      isBuiltIn: false,
      sortOrder: 10,
      dealerId: dealer.id,
    },
    update: {
      name: `${dealer.name} 웰컴`,
      html: `
        <section class="intranet-hero" style="padding:48px 32px;background:linear-gradient(135deg,${sidebar},${primary});color:#fff;border-radius:16px;margin-bottom:20px;">
          <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">${dealer.name}</h1>
          <p style="margin:0;opacity:0.9;">대리점 포털 — 재고·주문·Rollout 정보</p>
        </section>
      `,
    },
  });
}

export async function syncAllDealerPageThemes(): Promise<void> {
  const dealers = await prisma.dealer.findMany({ where: { isActive: true } });
  for (const dealer of dealers) {
    await syncDealerPageTheme(dealer.id);
  }
}
