"use client";

import { useEffect } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { FirestoreNotificationDoc } from "@/lib/firebase/types";
import { useFirebase } from "@/features/firebase/components/firebase-provider";

interface UseFirestoreNotificationsOptions {
  userId: string | undefined;
  enabled: boolean;
  onUpdate: (items: FirestoreNotificationDoc[], unread: number) => void;
}

export function useFirestoreNotifications({
  userId,
  enabled,
  onUpdate,
}: UseFirestoreNotificationsOptions) {
  const { config, flags } = useFirebase();

  useEffect(() => {
    if (!enabled || !flags.firestore || !config || !userId) return;

    const db = getFirebaseFirestore(config);
    const q = query(
      collection(db, "users", userId, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => d.data() as FirestoreNotificationDoc);
      const unread = items.filter((n) => !n.read).length;
      onUpdate(items, unread);
    });

    return () => unsub();
  }, [enabled, flags.firestore, config, userId, onUpdate]);
}
