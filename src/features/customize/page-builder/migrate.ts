import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_PAGE_BUILDER_CONFIG,
  type PageBuilderBlock,
  type PageBuilderConfig,
  type PageBuilderGridSection,
} from "@/features/customize/types";
const GRID_COLS = 12;

export function buildBannerGridFromLegacy(
  banner: NonNullable<PageBuilderConfig["banner"]>,
): PageBuilderGridSection {
  const blocks: PageBuilderBlock[] = [];
  if (banner.title || banner.subtitle || banner.buttonText) {
    blocks.push({
      id: "legacy_hero",
      type: "hero",
      x: 0,
      y: 0,
      w: GRID_COLS,
      h: 3,
      props: {
        text: banner.title,
        subtitle: banner.subtitle,
        label: banner.buttonText,
        href: banner.buttonLink,
        bgColor: "rgba(15,23,42,0.55)",
      },
    });
  }
  return { cols: GRID_COLS, rowHeight: 40, blocks };
}

export function buildPrGridFromLegacy(
  prHeader: NonNullable<PageBuilderConfig["prHeader"]>,
): PageBuilderGridSection {
  const blocks: PageBuilderBlock[] = [];
  let y = 0;
  if (prHeader.title) {
    blocks.push({
      id: "legacy_pr_title",
      type: "heading",
      x: 0,
      y,
      w: GRID_COLS,
      h: 1,
      props: { text: prHeader.title, align: "left" },
    });
    y += 1;
  }
  if (prHeader.subtitle) {
    blocks.push({
      id: "legacy_pr_sub",
      type: "text",
      x: 0,
      y,
      w: GRID_COLS,
      h: 1,
      props: { text: prHeader.subtitle, align: "left", color: "#64748B" },
    });
  }
  return { cols: GRID_COLS, rowHeight: 40, blocks };
}

export function buildDashboardGridFromLegacy(
  dashboard: NonNullable<PageBuilderConfig["dashboard"]>,
): PageBuilderGridSection {
  const sorted = [...dashboard.widgets].sort((a, b) => a.order - b.order);
  const blocks: PageBuilderBlock[] = sorted.map((w, i) => ({
    id: `widget_${w.id}`,
    type: "widget" as const,
    x: (i % 2) * 6,
    y: Math.floor(i / 2) * 4,
    w: 6,
    h: 4,
    props: { widgetId: w.id, visible: w.visible },
  }));
  return { cols: GRID_COLS, rowHeight: 40, blocks };
}

export function ensurePageBuilderGrids(config: PageBuilderConfig): PageBuilderConfig {
  const dashboard = config.dashboard ?? DEFAULT_PAGE_BUILDER_CONFIG.dashboard!;
  const banner = config.banner ?? DEFAULT_PAGE_BUILDER_CONFIG.banner!;
  const prHeader = config.prHeader ?? DEFAULT_PAGE_BUILDER_CONFIG.prHeader!;

  return {
    ...config,
    version: 2,
    dashboard,
    banner,
    prHeader,
    grids: {
      dashboard:
        config.grids?.dashboard ??
        buildDashboardGridFromLegacy(dashboard),
      banner:
        config.grids?.banner ??
        buildBannerGridFromLegacy(banner),
      pr:
        config.grids?.pr ??
        buildPrGridFromLegacy(prHeader),
    },
  };
}

export function stripPageBuilderGrids(config: PageBuilderConfig): PageBuilderConfig {
  const rest = { ...config };
  delete rest.grids;
  return { ...rest, version: 2 };
}

export function parsePageBuilderConfigWithGrids(raw: unknown): PageBuilderConfig {
  if (!raw || typeof raw !== "object") {
    return ensurePageBuilderGrids(DEFAULT_PAGE_BUILDER_CONFIG);
  }
  const o = raw as PageBuilderConfig;
  const base: PageBuilderConfig = {
    version: o.version ?? 1,
    dashboard: {
      columns: o.dashboard?.columns ?? DEFAULT_PAGE_BUILDER_CONFIG.dashboard!.columns,
      widgets:
        o.dashboard?.widgets?.length
          ? o.dashboard.widgets
          : DEFAULT_PAGE_BUILDER_CONFIG.dashboard!.widgets,
    },
    banner: { ...DEFAULT_PAGE_BUILDER_CONFIG.banner!, ...o.banner },
    prHeader: { ...DEFAULT_PAGE_BUILDER_CONFIG.prHeader!, ...o.prHeader },
    grids: o.grids,
  };
  return ensurePageBuilderGrids(syncLegacyFromGrids(base));
}

export function syncLegacyFromGrids(config: PageBuilderConfig): PageBuilderConfig {
  const grids = config.grids;
  if (!grids) return config;

  const hero = grids.banner?.blocks.find((b) => b.type === "hero");
  const prHeading = grids.pr?.blocks.find((b) => b.type === "heading");
  const prText = grids.pr?.blocks.find((b) => b.type === "text");

  const widgetBlocks =
    grids.dashboard?.blocks.filter((b) => b.type === "widget") ?? [];

  return {
    ...config,
    banner: hero
      ? {
          title: hero.props.text ?? config.banner?.title ?? "",
          subtitle: hero.props.subtitle ?? config.banner?.subtitle ?? "",
          buttonText: hero.props.label ?? config.banner?.buttonText ?? "",
          buttonLink: hero.props.href ?? config.banner?.buttonLink ?? "",
        }
      : config.banner,
    prHeader: {
      title: prHeading?.props.text ?? config.prHeader?.title ?? "",
      subtitle: prText?.props.text ?? config.prHeader?.subtitle ?? "",
    },
    dashboard: {
      columns: config.dashboard?.columns ?? "2",
      widgets:
        widgetBlocks.length > 0
          ? widgetBlocks.map((b, i) => ({
              id: b.props.widgetId ?? "stats",
              visible: b.props.visible ?? true,
              order: i,
            }))
          : (config.dashboard?.widgets ?? DEFAULT_DASHBOARD_LAYOUT.widgets),
    },
  };
}
