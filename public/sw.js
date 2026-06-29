/**
 * Intranet SW — 캐시 비활성 (network-only)
 * 배포 시 install/activate에서 기존 Cache Storage 전부 삭제.
 * fetch 핸들러 없음 → 브라우저가 항상 네트워크에서 최신 리소스를 받음.
 */
const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "0";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 버전 확인용 (클라이언트에서 postMessage 가능)
self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_SW_VERSION") {
    event.source?.postMessage({ type: "SW_VERSION", version: SW_VERSION });
  }
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});
