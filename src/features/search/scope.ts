import type { Prisma } from "@prisma/client";
import type { Role } from "@/lib/auth/roles";
import { hasMinRole } from "@/lib/auth/roles";

/** SharedDocument dealer scope — HQ/ADMIN은 전체, DEALER는 공용+소속 */
export function sharedDocumentDealerWhere(
  role: Role,
  dealerId: string | null | undefined,
): Prisma.SharedDocumentWhereInput | undefined {
  if (hasMinRole(role, "HEADQUARTER")) return undefined;
  if (!dealerId) return { dealerId: null };
  return { OR: [{ dealerId: null }, { dealerId }] };
}

/** User 검색 dealer scope */
export function userSearchDealerWhere(
  role: Role,
  dealerId: string | null | undefined,
): Prisma.UserWhereInput | undefined {
  if (hasMinRole(role, "HEADQUARTER")) return undefined;
  if (!dealerId) return { dealerId: null };
  return {
    OR: [{ dealerId }, { role: { in: ["HEADQUARTER", "ADMIN"] } }],
  };
}
