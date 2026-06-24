import "server-only";

import Redis from "ioredis";

import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("redis");

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", (err) => log.warn({ err: err.message }, "redis error"));
    return client;
  } catch (e) {
    log.warn({ err: e }, "redis init failed");
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    if (r.status !== "ready") await r.connect();
    return r.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (r.status !== "ready") await r.connect();
    await r.setex(key, ttlSeconds, value);
  } catch {
    /* ignore */
  }
}

export async function redisDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    if (r.status !== "ready") await r.connect();
    await r.del(key);
  } catch {
    /* ignore */
  }
}
