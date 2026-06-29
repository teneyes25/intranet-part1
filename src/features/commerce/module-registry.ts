import type { CommerceModuleId, CommerceModuleMeta, CommerceStubResponse } from "@/features/commerce/types";

export const COMMERCE_MODULES: Record<CommerceModuleId, CommerceModuleMeta> = {
  order: {
    id: "order",
    label: "발주서",
    href: "/commerce/orders/new",
    apiPath: "/api/commerce/orders",
    status: "stub",
  },
  "tax-invoice": {
    id: "tax-invoice",
    label: "세금계산서",
    href: "/commerce/tax-invoices",
    apiPath: "/api/commerce/tax-invoices",
    status: "stub",
  },
  payment: {
    id: "payment",
    label: "카드결제",
    href: "/commerce/payments",
    apiPath: "/api/commerce/payments",
    status: "stub",
  },
  contract: {
    id: "contract",
    label: "표준계약서",
    href: "/commerce/contracts",
    apiPath: "/api/commerce/contracts",
    status: "stub",
  },
};

export function resolveCommerceModule(
  raw: string | null | undefined,
): CommerceModuleMeta | null {
  if (!raw) return null;
  return COMMERCE_MODULES[raw as CommerceModuleId] ?? null;
}

export function buildCommerceStubResponse(
  moduleId: CommerceModuleId,
): CommerceStubResponse {
  const meta = COMMERCE_MODULES[moduleId];
  return {
    module: moduleId,
    status: "stub",
    message: `${meta.label} 모듈 — Part 2 거래 연동 예정`,
    href: meta.href,
    apiPath: meta.apiPath,
    part2Ready: false,
  };
}
