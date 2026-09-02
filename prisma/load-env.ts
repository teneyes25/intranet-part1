/**
 * Prisma CLI 는 .env 를 자동 로드하지만, `tsx prisma/seed.ts` 직접 실행 시에는
 * DATABASE_URL 이 비어 있을 수 있다 (Windows CMD 에서 자주 발생).
 * seed 진입 전에 .env / .env.production 을 process.env 에 채운다.
 *
 * 사무실 Docker 는 intranet 사용자 — .env 의 postgres@localhost 는 무시한다.
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

function dbUserFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).username || "");
  } catch {
    const m = url.match(/^postgres(?:ql)?:\/\/([^:@/]+)/i);
    const user = m?.[1];
    return user ? decodeURIComponent(user) : "";
  }
}

function buildHostUrl(
  user: string,
  password: string,
  db: string,
  port: string,
): string {
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${db}?schema=public`;
}

export function loadEnvFiles(cwd = process.cwd()) {
  // production 먼저 → POSTGRES_* 확보, 이후 .env 로 덮되 DATABASE_URL 은 아래에서 검증
  for (const name of [".env.production", ".env", ".env.local"]) {
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

  const url = process.env.DATABASE_URL || "";
  const bad =
    !url ||
    url.includes("@db:") ||
    url.includes("@db/") ||
    dbUserFromUrl(url) === "postgres";

  if (bad) {
    const user = process.env.POSTGRES_USER || "intranet";
    const password = process.env.POSTGRES_PASSWORD || "";
    const db = process.env.POSTGRES_DB || "intranet";
    const port = process.env.POSTGRES_PORT || "5432";
    if (password) {
      if (dbUserFromUrl(url) === "postgres") {
        console.warn(
          "[load-env] postgres@localhost DATABASE_URL 무시 → intranet@127.0.0.1 사용",
        );
      }
      process.env.DATABASE_URL = buildHostUrl(user, password, db, port);
    }
  }
}

loadEnvFiles();
