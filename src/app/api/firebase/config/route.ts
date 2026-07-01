import { NextResponse } from "next/server";

import {
  getFirebaseClientConfig,
  getFirebaseFeatureFlags,
  getFirebaseVapidKey,
  isFirebaseConfigured,
} from "@/lib/firebase/config";

/** 클라이언트 Firebase 초기화용 공개 설정 */
export async function GET() {
  const config = getFirebaseClientConfig();
  const flags = getFirebaseFeatureFlags();

  return NextResponse.json({
    enabled: isFirebaseConfigured() && process.env.FIREBASE_ENABLED !== "false",
    config,
    flags,
    vapidKey: getFirebaseVapidKey() ?? null,
  });
}
