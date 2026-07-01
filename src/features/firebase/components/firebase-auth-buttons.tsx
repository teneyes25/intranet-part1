"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useFirebase } from "@/features/firebase/components/firebase-provider";

interface FirebaseAuthButtonsProps {
  callbackUrl?: string;
}

export function FirebaseAuthButtons({ callbackUrl = "/dashboard" }: FirebaseAuthButtonsProps) {
  const { config, flags, ready } = useFirebase();
  const [loading, setLoading] = useState(false);

  if (!ready || !flags.auth || !config) return null;

  async function signInWithGoogle() {
    if (!config) return;
    setLoading(true);
    try {
      const auth = getFirebaseAuth(config);
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      const res = await signIn("firebase", {
        idToken,
        redirect: false,
      });

      if (!res || res.error) {
        toast.error("Google 로그인에 실패했습니다. 등록된 사내 계정 이메일인지 확인하세요.");
        return;
      }

      window.location.href = callbackUrl;
    } catch (e) {
      console.error(e);
      toast.error("Google 로그인이 취소되었거나 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">또는</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={loading}
        onClick={() => void signInWithGoogle()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Google로 로그인
      </Button>
    </div>
  );
}
