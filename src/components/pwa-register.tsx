"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

async function purgeAllCaches() {
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

/** PWA: 배포 시 캐시 강제 무효화 + SW 갱신 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    async function syncServiceWorker() {
      const stored = localStorage.getItem("intranet-build-id");

      if (stored && stored !== BUILD_ID) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.unregister();
        await purgeAllCaches();
        localStorage.setItem("intranet-build-id", BUILD_ID);
        window.location.reload();
        return;
      }

      localStorage.setItem("intranet-build-id", BUILD_ID);
      await purgeAllCaches();

      const reg = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`, {
        updateViaCache: "none",
      });

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            purgeAllCaches().then(() => window.location.reload());
          }
        });
      });

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    }

    void syncServiceWorker();
  }, []);

  return null;
}
