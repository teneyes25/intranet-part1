import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getFirebaseFeatureFlags } from "@/lib/firebase/config";
import type { FirestoreNotificationDoc } from "@/lib/firebase/types";

export function isFirestoreEnabled(): boolean {
  return getFirebaseFeatureFlags().firestore;
}

export async function syncNotificationToFirestore(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read: boolean;
    createdAt: Date;
  },
): Promise<void> {
  if (!isFirestoreEnabled()) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  const doc: FirestoreNotificationDoc = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };

  await db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .doc(notification.id)
    .set(doc);
}

export async function markFirestoreNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!isFirestoreEnabled()) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;
  await db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .doc(notificationId)
    .set({ read: true }, { merge: true });
}

export async function markAllFirestoreNotificationsRead(userId: string): Promise<void> {
  if (!isFirestoreEnabled()) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("notifications")
    .where("read", "==", false)
    .limit(100)
    .get();

  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  if (!snap.empty) await batch.commit();
}

export function pageBuilderSessionId(slug: string, dealerScope: string): string {
  return `${slug}__${dealerScope}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function upsertPageBuilderPresence(data: {
  sessionId: string;
  userId: string;
  userName: string;
  slug: string;
  dealerScope: string;
}): Promise<void> {
  if (!isFirestoreEnabled()) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  await db
    .collection("page_builder_sessions")
    .doc(data.sessionId)
    .collection("presence")
    .doc(data.userId)
    .set({
      userId: data.userId,
      userName: data.userName,
      slug: data.slug,
      dealerScope: data.dealerScope,
      lastSeenAt: FieldValue.serverTimestamp(),
    });
}

export async function savePageBuilderDraft(data: {
  sessionId: string;
  userId: string;
  userName: string;
  htmlPreview: string;
  cssLength: number;
}): Promise<void> {
  if (!isFirestoreEnabled()) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  await db
    .collection("page_builder_sessions")
    .doc(data.sessionId)
    .collection("drafts")
    .doc(data.userId)
    .set({
      userId: data.userId,
      userName: data.userName,
      htmlPreview: data.htmlPreview.slice(0, 500),
      cssLength: data.cssLength,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function saveFcmToken(
  userId: string,
  token: string,
  deviceLabel?: string,
): Promise<void> {
  if (!getFirebaseFeatureFlags().messaging) return;
  const db = getFirebaseAdminFirestore();
  if (!db) return;

  await db
    .collection("users")
    .doc(userId)
    .collection("fcm_tokens")
    .doc(token.slice(0, 64))
    .set({
      token,
      deviceLabel: deviceLabel ?? "web",
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; link?: string },
): Promise<void> {
  if (!getFirebaseFeatureFlags().messaging) return;
  const { getFirebaseAdminMessaging } = await import("@/lib/firebase/admin");
  const messaging = getFirebaseAdminMessaging();
  const db = getFirebaseAdminFirestore();
  if (!messaging || !db) return;

  const tokensSnap = await db
    .collection("users")
    .doc(userId)
    .collection("fcm_tokens")
    .limit(20)
    .get();

  const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean);
  if (tokens.length === 0) return;

  await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.link ? { link: payload.link } : undefined,
    webpush: payload.link
      ? { fcmOptions: { link: payload.link } }
      : undefined,
  });
}
