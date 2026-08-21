/**
 * Prisma CLI 는 .env 를 자동 로드하지만, `tsx prisma/seed.ts` 직접 실행 시에는
 * DATABASE_URL 이 비어 있을 수 있다 (Windows CMD 에서 자주 발생).
 * seed 진입 전에 .env / .env.production 을 process.env 에 채운다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripQuotes(value: string) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

export function loadEnvFiles(cwd = process.cwd()) {
  for (const name of [".env", ".env.local", ".env.production"]) {
    const file = resolve(cwd, name);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      const value = stripQuotes(line.slice(eq + 1));
      if (!(key in process.env) || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }

  // Docker Compose 용 .env.production 만 있고 DATABASE_URL 이 비어 있으면 호스트용 URL 구성
  if (!process.env.DATABASE_URL) {
    const user = process.env.POSTGRES_USER || "intranet";
    const password = process.env.POSTGRES_PASSWORD || "";
    const db = process.env.POSTGRES_DB || "intranet";
    const port = process.env.POSTGRES_PORT || "5432";
    if (password) {
      process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${db}?schema=public`;
    }
  }
}

loadEnvFiles();
