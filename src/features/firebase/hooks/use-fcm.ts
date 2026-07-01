"use client";

import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { useSession } from "next-auth/react";

import { getFirebaseMessagingClient } from "@/lib/firebase/client";
import { useFirebase } from "@/features/firebase/components/firebase-provider";

export function useFcmRegistration() {
  const { config, flags, vapidKey, ready } = useFirebase();
  const { data: session } = useSession();

  useEffect(() => {
    if (!ready || !flags.messaging || !config || !vapidKey || !session?.user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function register() {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const messaging = await getFirebaseMessagingClient(config!);
      if (!messaging) return;

      try {
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const token = await getToken(messaging, { vapidKey: vapidKey!, serviceWorkerRegistration: reg });
        if (!token) return;

        await fetch("/api/firebase/fcm/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, deviceLabel: navigator.userAgent.slice(0, 80) }),
        });
      } catch (e) {
        console.warn("[fcm] registration skipped:", e);
      }
    }

    void register();
  }, [ready, flags.messaging, config, vapidKey, session?.user]);
}
