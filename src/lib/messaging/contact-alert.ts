import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { normalizePhone } from "@/lib/phone";

export type MessageChannel = "kakao" | "sms" | "log";

export interface SendResult {
  ok: boolean;
  channel: MessageChannel;
  provider: string;
  error?: string;
}

function solapiAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** SMS 발송 — Solapi / 웹훅 / 로그(스텁) */
export async function sendSms(
  toRaw: string,
  text: string,
  opts?: { from?: string | null },
): Promise<SendResult> {
  const to = normalizePhone(toRaw);
  if (!to) {
    return { ok: false, channel: "sms", provider: "none", error: "invalid_phone" };
  }
  const fromOverride = opts?.from ? normalizePhone(opts.from) : null;

  const webhook = process.env.SMS_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          text,
          channel: "sms",
          from: fromOverride || undefined,
        }),
      });
      if (!res.ok) {
        return {
          ok: false,
          channel: "sms",
          provider: "webhook",
          error: `http_${res.status}`,
        };
      }
      return { ok: true, channel: "sms", provider: "webhook" };
    } catch (e) {
      return {
        ok: false,
        channel: "sms",
        provider: "webhook",
        error: e instanceof Error ? e.message : "webhook_failed",
      };
    }
  }

  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from =
    fromOverride ||
    process.env.SOLAPI_FROM?.trim() ||
    "";
  if (apiKey && apiSecret && from) {
    try {
      const res = await fetch("https://api.solapi.com/messages/v4/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: solapiAuthHeader(apiKey, apiSecret),
        },
        body: JSON.stringify({
          message: {
            to,
            from,
            text: text.slice(0, 2000),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          channel: "sms",
          provider: "solapi",
          error: `http_${res.status}:${body.slice(0, 120)}`,
        };
      }
      return { ok: true, channel: "sms", provider: "solapi" };
    } catch (e) {
      return {
        ok: false,
        channel: "sms",
        provider: "solapi",
        error: e instanceof Error ? e.message : "solapi_failed",
      };
    }
  }

  console.log(
    `[sms:log] to=${to} from=${fromOverride || "-"} text=${text.slice(0, 200)}`,
  );
  return { ok: true, channel: "log", provider: "log" };
}

/**
 * 카카오 알림톡 가능 여부.
 * 필요 조건(비즈니스 채널·템플릿 심사·중계사 연동)이 모두 갖춰져야 true.
 * 현재 기본값은 SMS — 알림톡은 환경변수로만 활성화.
 */
export function isKakaoAlimtalkConfigured(): boolean {
  return (
    process.env.KAKAO_ALIMTALK_ENABLED === "true" &&
    !!process.env.SOLAPI_API_KEY &&
    !!process.env.SOLAPI_API_SECRET &&
    !!process.env.SOLAPI_PF_ID &&
    !!process.env.SOLAPI_TEMPLATE_NOTICE
  );
}

/** 알림톡 시도 후 실패 시 SMS로 폴백 */
export async function sendContactAlert(
  toRaw: string,
  text: string,
  opts?: { from?: string | null },
): Promise<SendResult> {
  if (isKakaoAlimtalkConfigured()) {
    const to = normalizePhone(toRaw);
    if (!to) {
      return { ok: false, channel: "kakao", provider: "none", error: "invalid_phone" };
    }
    try {
      const apiKey = process.env.SOLAPI_API_KEY!;
      const apiSecret = process.env.SOLAPI_API_SECRET!;
      const from =
        (opts?.from ? normalizePhone(opts.from) : null) ||
        process.env.SOLAPI_FROM?.trim() ||
        undefined;
      const res = await fetch("https://api.solapi.com/messages/v4/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: solapiAuthHeader(apiKey, apiSecret),
        },
        body: JSON.stringify({
          message: {
            to,
            from,
            text: text.slice(0, 2000),
            kakaoOptions: {
              pfId: process.env.SOLAPI_PF_ID,
              templateId: process.env.SOLAPI_TEMPLATE_NOTICE,
              variables: {
                "#{내용}": text.slice(0, 200),
              },
              disableSms: false,
            },
          },
        }),
      });
      if (res.ok) {
        return { ok: true, channel: "kakao", provider: "solapi" };
      }
      console.warn(
        "[kakao] alimtalk failed, falling back to SMS:",
        res.status,
        await res.text().catch(() => ""),
      );
    } catch (e) {
      console.warn("[kakao] alimtalk error, SMS fallback:", e);
    }
  }

  return sendSms(toRaw, text, opts);
}

export function messagingStatusSummary(): string {
  if (isKakaoAlimtalkConfigured()) {
    return "kakao_alimtalk(+sms_fallback)";
  }
  if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_FROM) {
    return "sms_solapi";
  }
  if (process.env.SMS_WEBHOOK_URL) {
    return "sms_webhook";
  }
  return "sms_log_stub";
}
