"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { FirebaseClientConfig, FirebaseFeatureFlags } from "@/lib/firebase/types";

interface FirebaseRuntime {
  enabled: boolean;
  config: FirebaseClientConfig | null;
  flags: FirebaseFeatureFlags;
  vapidKey: string | null;
  ready: boolean;
}

const defaultFlags: FirebaseFeatureFlags = {
  auth: false,
  storage: false,
  firestore: false,
  messaging: false,
  analytics: false,
};

const FirebaseContext = createContext<FirebaseRuntime>({
  enabled: false,
  config: null,
  flags: defaultFlags,
  vapidKey: null,
  ready: false,
});

export function useFirebase() {
  return useContext(FirebaseContext);
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [runtime, setRuntime] = useState<FirebaseRuntime>({
    enabled: false,
    config: null,
    flags: defaultFlags,
    vapidKey: null,
    ready: false,
  });

  useEffect(() => {
    fetch("/api/firebase/config")
      .then((r) => r.json())
      .then((data: FirebaseRuntime) => setRuntime({ ...data, ready: true }))
      .catch(() => setRuntime((prev) => ({ ...prev, ready: true })));
  }, []);

  return (
    <FirebaseContext.Provider value={runtime}>{children}</FirebaseContext.Provider>
  );
}
