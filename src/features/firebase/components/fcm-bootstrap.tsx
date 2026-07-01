"use client";

import { useFcmRegistration } from "@/features/firebase/hooks/use-fcm";

/** 로그인 사용자 FCM 토큰 등록 */
export function FcmBootstrap() {
  useFcmRegistration();
  return null;
}
