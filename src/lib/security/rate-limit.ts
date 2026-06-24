import "server-only";

import { redisGet, redisSet } from "@/lib/redis/client";

/** In-memory fallback when Redis unavailable */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export type RateLimitTier = "auth" | "ai" | "api" | "upload";

const TIER_LIMITS: Record<RateLimitTier, { max: number; windowSec: number }> = {
  auth: { max: 10, windowSec: 60 },
  ai: { max: 30, windowSec: 60 },
  api: { max: 120, windowSec: 60 },
  upload: { max: 20, windowSec: 60 },
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

function memoryRateLimit(
  key: string,
  max: number,
  windowSec: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowSec * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit: max, remaining: max - 1, resetAt };
  }

  if (entry.count >= max) {
    return { success: false, limit: max, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    limit: max,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
  };
}

async function redisRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const redisKey = `rl:${key}`;
  const existing = await redisGet(redisKey);
  const now = Date.now();

  if (!existing) {
    const resetAt = now + windowSec * 1000;
    await redisSet(redisKey, JSON.stringify({ count: 1, resetAt }), windowSec);
    return { success: true, limit: max, remaining: max - 1, resetAt };
  }

  try {
    const parsed = JSON.parse(existing) as { count: number; resetAt: number };
    if (parsed.count >= max) {
      return { success: false, limit: max, remaining: 0, resetAt: parsed.resetAt };
    }
    parsed.count += 1;
    const ttl = Math.max(1, Math.ceil((parsed.resetAt - now) / 1000));
    await redisSet(redisKey, JSON.stringify(parsed), ttl);
    return {
      success: true,
      limit: max,
      remaining: max - parsed.count,
      resetAt: parsed.resetAt,
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "api",
): Promise<RateLimitResult> {
  const { max, windowSec } = TIER_LIMITS[tier];
  const key = `${tier}:${identifier}`;

  const redisResult = await redisRateLimit(key, max, windowSec);
  if (redisResult) return redisResult;

  return memoryRateLimit(key, max, windowSec);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
