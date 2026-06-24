import "server-only";

import { redisGet, redisSet } from "@/lib/redis/client";

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = await redisGet(key);
  if (hit) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      /* fall through */
    }
  }

  const value = await fn();
  await redisSet(key, JSON.stringify(value), ttlSeconds);
  return value;
}

export const CACHE_TTL = {
  dashboard: 60,
  notices: 120,
  news: 300,
  userList: 60,
} as const;
