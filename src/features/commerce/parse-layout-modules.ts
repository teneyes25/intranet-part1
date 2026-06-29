import { resolveCommerceModule } from "@/features/commerce/module-registry";
import type { CommerceModuleMeta } from "@/features/commerce/types";

const MODULE_ATTR = /data-commerce-module=["']([^"']+)["']/gi;

/** Page Layout HTML에서 거래 모듈 블록 추출 */
export function parseCommerceModulesFromHtml(html: string): CommerceModuleMeta[] {
  const seen = new Set<string>();
  const modules: CommerceModuleMeta[] = [];

  for (const match of html.matchAll(MODULE_ATTR)) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    const meta = resolveCommerceModule(id);
    if (meta) {
      seen.add(id);
      modules.push(meta);
    }
  }

  return modules;
}
