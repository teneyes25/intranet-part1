"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setPendingMessage(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      setServerError(data?.error ?? "회원가입에 실패했습니다.");
      return;
    }

    setPendingMessage(
      "가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
    );
    setTimeout(() => router.push("/login"), 2500);
  }

  if (pendingMessage) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm">
        <p className="font-medium text-primary">{pendingMessage}</p>
        <p className="mt-2 text-muted-foreground">잠시 후 로그인 페이지로 이동합니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">이름</Label>
        <Input id="name" placeholder="홍길동" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">휴대폰</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="010-1234-5678"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="8자 이상"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        가입 신청
      </Button>
    </form>
  );
}
