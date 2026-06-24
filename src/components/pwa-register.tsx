"use client";

import { useEffect } from "react";

/** PWA: 오프라인 셸 + 홈 화면 설치 지원 (기본) */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
