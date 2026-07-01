/** Firebase Storage 키 접두사 — Prisma storageKey 필드에 저장 */
export const FIREBASE_STORAGE_PREFIX = "firebase:" as const;

export type StorageBackend = "firebase" | "local";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseFeatureFlags {
  auth: boolean;
  storage: boolean;
  firestore: boolean;
  messaging: boolean;
  analytics: boolean;
}

export interface FirestoreNotificationDoc {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface PageBuilderPresenceDoc {
  userId: string;
  userName: string;
  slug: string;
  dealerScope: string;
  lastSeenAt: string;
}

export interface PageBuilderDraftDoc {
  userId: string;
  userName: string;
  updatedAt: string;
  /** 경량 메타만 — 본문은 PostgreSQL에 저장 */
  htmlPreview: string;
  cssLength: number;
}

export interface FcmTokenRegisterPayload {
  token: string;
  deviceLabel?: string;
}
