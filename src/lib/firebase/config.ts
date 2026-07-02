import type { FirebaseClientConfig, FirebaseFeatureFlags } from "@/lib/firebase/types";

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const apiKey = env("NEXT_PUBLIC_FIREBASE_API_KEY");
  const projectId = env("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const appId = env("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (!apiKey || !projectId || !appId) return null;

  return {
    apiKey,
    authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ?? `${projectId}.appspot.com`,
    messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") ?? "",
    appId,
    measurementId: env("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseClientConfig() !== null;
}

export function getFirebaseFeatureFlags(): FirebaseFeatureFlags {
  if (env("FIREBASE_ENABLED") === "false") {
    return {
      auth: false,
      storage: false,
      firestore: false,
      messaging: false,
      analytics: false,
    };
  }

  const configured = isFirebaseConfigured();
  const enabled = configured;

  return {
    auth: enabled && env("FIREBASE_AUTH_ENABLED") !== "false",
    storage: enabled && env("FIREBASE_STORAGE_ENABLED") !== "false",
    firestore: enabled && env("FIREBASE_FIRESTORE_ENABLED") !== "false",
    messaging: enabled && env("FIREBASE_MESSAGING_ENABLED") !== "false",
    analytics: enabled && env("FIREBASE_ANALYTICS_ENABLED") === "true",
  };
}

export function getFirebaseStorageBucket(): string | undefined {
  return getFirebaseClientConfig()?.storageBucket;
}

export function getFirebaseVapidKey(): string | undefined {
  return env("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
}

/** Admin SDK — 서비스 계정 JSON 문자열 또는 base64 */
export function getFirebaseServiceAccountJson(): string | undefined {
  const raw = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) return undefined;
  if (raw.startsWith("{")) return raw;
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

export function isFirebaseAdminConfigured(): boolean {
  return !!getFirebaseServiceAccountJson() || !!env("GOOGLE_APPLICATION_CREDENTIALS");
}
