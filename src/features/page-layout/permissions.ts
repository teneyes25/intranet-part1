import "server-only";

import { redirect } from "next/navigation";

import { GLOBAL_LAYOUT_SCOPE } from "@/features/page-layout/types";
import { requireUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";

export interface PageBuilderUser {
  id: string;
  role: Role;
  dealerId?: string | null;
}

export interface PageBuilderAccess {
  canEdit: boolean;
  /** 본사 HEADQUARTER: 미리보기만, 저장 불가 */
  isReadOnly: boolean;
  isHqAdmin: boolean;
  lockedDealerId: string | null;
  defaultDealerScope: string;
  canEditGlobal: boolean;
}

export function getPageBuilderAccess(user: PageBuilderUser): PageBuilderAccess {
  if (user.role === "ADMIN") {
    return {
      canEdit: true,
      isReadOnly: false,
      isHqAdmin: true,
      lockedDealerId: null,
      defaultDealerScope: GLOBAL_LAYOUT_SCOPE,
      canEditGlobal: true,
    };
  }

  if (user.role === "HEADQUARTER") {
    return {
      canEdit: true,
      isReadOnly: true,
      isHqAdmin: false,
      lockedDealerId: null,
      defaultDealerScope: GLOBAL_LAYOUT_SCOPE,
      canEditGlobal: false,
    };
  }

  if (user.role === "DEALER" && user.dealerId) {
    return {
      canEdit: true,
      isReadOnly: false,
      isHqAdmin: false,
      lockedDealerId: user.dealerId,
      defaultDealerScope: user.dealerId,
      canEditGlobal: false,
    };
  }

  return {
    canEdit: false,
    isReadOnly: false,
    isHqAdmin: false,
    lockedDealerId: null,
    defaultDealerScope: GLOBAL_LAYOUT_SCOPE,
    canEditGlobal: false,
  };
}

export function assertPageBuilderAccess(user: PageBuilderUser): PageBuilderAccess {
  const access = getPageBuilderAccess(user);
  if (!access.canEdit) {
    throw new Error("Page Builder 접근 권한이 없습니다.");
  }
  return access;
}

export function resolveDealerScopeForSave(
  access: PageBuilderAccess,
  requestedDealerId: string | undefined,
): string {
  if (access.lockedDealerId) {
    return access.lockedDealerId;
  }
  const scope = requestedDealerId ?? GLOBAL_LAYOUT_SCOPE;
  if (scope === GLOBAL_LAYOUT_SCOPE) return GLOBAL_LAYOUT_SCOPE;
  return scope;
}

export function assertCanMutatePageLayout(access: PageBuilderAccess): void {
  if (access.isReadOnly) {
    throw new Error("미리보기 전용 계정은 저장·적용·복원할 수 없습니다.");
  }
}

export function assertDealerScopeAllowed(
  access: PageBuilderAccess,
  dealerId: string,
): void {
  if (access.lockedDealerId && dealerId !== access.lockedDealerId) {
    throw new Error("자사 대리점 레이아웃만 편집할 수 있습니다.");
  }
  if (!access.canEditGlobal && dealerId === GLOBAL_LAYOUT_SCOPE) {
    throw new Error("본사(global) 레이아웃은 본사 관리자만 편집할 수 있습니다.");
  }
}

export async function requirePageBuilderAccess() {
  const user = await requireUser();
  const access = getPageBuilderAccess(user);
  if (!access.canEdit) {
    redirect("/dashboard");
  }
  return { user, access };
}
