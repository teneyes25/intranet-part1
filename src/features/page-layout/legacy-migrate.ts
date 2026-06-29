import type { PageBuilderConfig, PageBuilderGridSection } from "@/features/customize/types";
import {
  boardLayoutSlug,
  CORE_PAGE_LAYOUT_SLUGS,
  LEGACY_PR_SLUG,
} from "@/features/page-layout/types";

function gridToHtml(section: PageBuilderGridSection | undefined): string {
  if (!section?.blocks.length) return "";
  return section.blocks
    .map((block) => {
      const p = block.props;
      switch (block.type) {
        case "hero":
          return `<section class="intranet-hero" style="padding:48px 32px;background:${p.bgColor ?? "linear-gradient(135deg,#0F172A,#1E293B)"};color:#fff;border-radius:16px;">
            <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">${p.text ?? ""}</h1>
            <p style="opacity:0.85;margin:0 0 16px;">${p.subtitle ?? ""}</p>
            ${p.label ? `<a href="${p.href ?? "/dashboard"}" class="intranet-hero-cta" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;">${p.label}</a>` : ""}
          </section>`;
        case "heading":
          return `<h2 style="font-size:1.5rem;font-weight:700;color:#0F172A;margin:0 0 8px;">${p.text ?? ""}</h2>`;
        case "text":
          return `<p style="color:${p.color ?? "#64748B"};margin:0 0 16px;">${p.text ?? ""}</p>`;
        case "widget":
          return `<article class="intranet-card" style="padding:20px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;">
            <h3 style="margin:0 0 6px;">${p.widgetId ?? "widget"}</h3>
          </article>`;
        default:
          return `<div class="intranet-card" style="padding:16px;border:1px solid #E2E8F0;border-radius:8px;">${block.type}</div>`;
      }
    })
    .join("\n");
}

export interface LegacyMigrationTarget {
  slug: string;
  html: string;
  css: string;
}

export function buildLegacyMigrationTargets(
  config: PageBuilderConfig,
): LegacyMigrationTarget[] {
  const grids = config.grids;
  if (!grids) return [];

  const targets: LegacyMigrationTarget[] = [];

  for (const slug of CORE_PAGE_LAYOUT_SLUGS) {
    const html = gridToHtml(grids[slug]);
    if (html) targets.push({ slug, html, css: "" });
  }

  const prHtml = gridToHtml(grids.pr);
  if (prHtml) {
    targets.push({ slug: boardLayoutSlug("pr"), html: prHtml, css: "" });
    targets.push({ slug: LEGACY_PR_SLUG, html: prHtml, css: "" });
  }

  return targets;
}

export function hasLegacyGridContent(config: PageBuilderConfig): boolean {
  return buildLegacyMigrationTargets(config).length > 0;
}
