"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import type { Editor } from "grapesjs";

import { getFirebaseFirestore } from "@/lib/firebase/client";
import type { PageBuilderDraftDoc, PageBuilderPresenceDoc } from "@/lib/firebase/types";
import { useFirebase } from "@/features/firebase/components/firebase-provider";

function sessionKey(slug: string, dealerScope: string) {
  return `${slug}__${dealerScope}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface UsePageBuilderCollaborationOptions {
  slug: string;
  dealerScope: string;
  userId: string | undefined;
  userName: string;
  editorRef: React.RefObject<Editor | null>;
  readOnly?: boolean;
}

export function usePageBuilderCollaboration({
  slug,
  dealerScope,
  userId,
  editorRef,
  readOnly,
}: UsePageBuilderCollaborationOptions) {
  const { config, flags } = useFirebase();
  const lastDraftToastRef = useRef<string>("");

  // Presence heartbeat + draft sync
  useEffect(() => {
    if (!flags.firestore || !userId || readOnly) return;

    const ping = () => {
      void fetch("/api/firebase/page-builder/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "presence",
          slug,
          dealerScope,
        }),
      });
    };

    ping();
    const interval = setInterval(ping, 25_000);
    return () => clearInterval(interval);
  }, [flags.firestore, slug, dealerScope, userId, readOnly]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!flags.firestore || !userId || !editor || readOnly) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const onChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fetch("/api/firebase/page-builder/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "draft",
            slug,
            dealerScope,
            htmlPreview: editor.getHtml().slice(0, 500),
            cssLength: (editor.getCss() ?? "").length,
          }),
        });
      }, 3000);
    };

    editor.on("component:update", onChange);
    editor.on("style:change", onChange);
    return () => {
      if (timer) clearTimeout(timer);
      editor.off("component:update", onChange);
      editor.off("style:change", onChange);
    };
  }, [flags.firestore, slug, dealerScope, userId, editorRef, readOnly]);

  // Listen for other editors
  useEffect(() => {
    if (!flags.firestore || !config || !userId) return;

    const db = getFirebaseFirestore(config);
    const sid = sessionKey(slug, dealerScope);

    const unsubPresence = onSnapshot(
      collection(db, "page_builder_sessions", sid, "presence"),
      (snap) => {
        const others = snap.docs
          .map((d) => d.data() as PageBuilderPresenceDoc)
          .filter((p) => p.userId !== userId);
        if (others.length > 0) {
          const names = others.map((o) => o.userName).join(", ");
          toast.message(`동시 편집 중: ${names}`, { id: "pb-presence" });
        }
      },
    );

    const unsubDrafts = onSnapshot(
      collection(db, "page_builder_sessions", sid, "drafts"),
      (snap) => {
        for (const doc of snap.docs) {
          const draft = doc.data() as PageBuilderDraftDoc;
          if (draft.userId === userId) continue;
          const key = `${draft.userId}:${draft.updatedAt}`;
          if (lastDraftToastRef.current === key) continue;
          lastDraftToastRef.current = key;
          toast.info(`${draft.userName}님이 레이아웃을 수정 중입니다.`, {
            id: `pb-draft-${draft.userId}`,
          });
        }
      },
    );

    return () => {
      unsubPresence();
      unsubDrafts();
    };
  }, [flags.firestore, config, slug, dealerScope, userId]);
}
