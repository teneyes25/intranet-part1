"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import type { FirebaseClientConfig } from "@/lib/firebase/types";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let messaging: Messaging | null = null;

export function initFirebaseClient(config: FirebaseClientConfig): FirebaseApp {
  if (app) return app;
  const existing = getApps()[0];
  app = existing ?? initializeApp(config);
  return app;
}

export function getFirebaseAuth(config: FirebaseClientConfig): Auth {
  if (!auth) auth = getAuth(initFirebaseClient(config));
  return auth;
}

export function getFirebaseFirestore(config: FirebaseClientConfig): Firestore {
  if (!firestore) firestore = getFirestore(initFirebaseClient(config));
  return firestore;
}

export function getFirebaseStorageClient(config: FirebaseClientConfig): FirebaseStorage {
  if (!storage) storage = getStorage(initFirebaseClient(config));
  return storage;
}

export async function getFirebaseMessagingClient(
  config: FirebaseClientConfig,
): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  messaging = getMessaging(initFirebaseClient(config));
  return messaging;
}
