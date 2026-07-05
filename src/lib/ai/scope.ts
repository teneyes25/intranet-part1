import type { Role } from "@/lib/auth/roles";
import { hasMinRole } from "@/lib/auth/roles";

export interface RagScope {
  role: Role;
  dealerId: string | null;
}

/** ingest 시 청크에 기록할 dealer 범위 */
export function resolveChunkDealerScope(authorDealerId: string | null | undefined): {
  dealerId: string | null;
  minRole: Role | null;
} {
  if (authorDealerId) {
    return { dealerId: authorDealerId, minRole: null };
  }
  return { dealerId: null, minRole: null };
}

/** RAG 검색 결과가 사용자 scope 내인지 */
export function canAccessChunk(
  scope: RagScope,
  chunk: { dealerId?: string | null; minRole?: string | null },
): boolean {
  if (chunk.minRole && !hasMinRole(scope.role, chunk.minRole as Role)) {
    return false;
  }
  if (hasMinRole(scope.role, "HEADQUARTER")) return true;
  if (!chunk.dealerId) return true;
  return scope.dealerId === chunk.dealerId;
}
