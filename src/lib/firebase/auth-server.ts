import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { getFirebaseFeatureFlags } from "@/lib/firebase/config";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/service";

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<DecodedIdToken | null> {
  if (!getFirebaseFeatureFlags().auth) return null;
  const auth = getFirebaseAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/** Firebase 토큰 → Prisma User (이메일 매칭, 스키마 변경 없음) */
export async function resolvePrismaUserFromFirebaseToken(idToken: string) {
  const decoded = await verifyFirebaseIdToken(idToken);
  if (!decoded?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
    include: {
      dealer: {
        select: { id: true, name: true, isActive: true, rolloutActive: true },
      },
    },
  });

  if (!user || !user.isActive || user.approvalStatus !== "APPROVED") {
    void writeAudit({
      action: "LOGIN_FAILURE",
      userEmail: decoded.email,
      detail: "firebase_user_not_allowed",
      success: false,
    });
    return null;
  }

  void writeAudit({
    action: "LOGIN_SUCCESS",
    userId: user.id,
    userEmail: user.email,
    detail: `firebase:${decoded.firebase?.sign_in_provider ?? "unknown"}`,
    success: true,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    dealerId: user.dealerId,
    dealerName: user.dealer?.name ?? null,
    dealerActive: user.dealer?.isActive ?? true,
    dealerRolloutActive: user.dealer?.rolloutActive ?? true,
    mustChangePassword: user.mustChangePassword,
  };
}
