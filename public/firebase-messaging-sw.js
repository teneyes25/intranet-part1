/* eslint-disable no-restricted-globals */
/** Firebase Cloud Messaging service worker — config는 postMessage로 주입 */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

let initialized = false;

self.addEventListener("message", (event) => {
  const config = event.data?.firebaseConfig;
  if (!config || initialized) return;
  firebase.initializeApp(config);
  initialized = true;
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.notification?.title ?? "인트라넷 알림";
  const options = {
    body: data.notification?.body ?? "",
    data: data.data ?? {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link;
  if (link) {
    event.waitUntil(clients.openWindow(link));
  }
});
