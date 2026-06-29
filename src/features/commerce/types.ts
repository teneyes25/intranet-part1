export type CommerceModuleId = "order" | "tax-invoice" | "payment" | "contract";

export interface CommerceModuleMeta {
  id: CommerceModuleId;
  label: string;
  href: string;
  apiPath: string;
  status: "stub" | "active";
}

export interface CommerceStubResponse {
  module: CommerceModuleId;
  status: "stub";
  message: string;
  href: string;
  apiPath: string;
  part2Ready: boolean;
}
