#!/usr/bin/env node
/**
 * 사무실 PC(Windows 포함)에서 Docker Postgres 에 migrate + seed.
 * usage: npm run office:db-seed
 *
 * - .env / .env.production 에서 POSTGRES_* 또는 DATABASE_URL 로드
 * - 호스트→컨테이너 DB 는 127.0.0.1:5432 (intranet 사용자)
 * - postgres 계정/로컬 임의 Postgres 와 혼동하지 말 것
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function stripQuotes(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function loadEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = stripQuotes(line.slice(eq + 1));
  }
  return out;
}

function run(cmd, args, env) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function main() {
  const fromDot = loadEnvFile(path.join(root, ".env"));
  const fromProd = loadEnvFile(path.join(root, ".env.production"));
  const merged = { ...fromProd, ...fromDot, ...process.env };

  const user = merged.POSTGRES_USER || "intranet";
  const password = merged.POSTGRES_PASSWORD || "";
  const db = merged.POSTGRES_DB || "intranet";
  const port = merged.POSTGRES_PORT || "5432";

  let databaseUrl = merged.DATABASE_URL || "";
  // docker-compose 내부용 @db:5432 는 호스트 시드에서 쓸 수 없음
  if (!databaseUrl || databaseUrl.includes("@db:")) {
    if (!password) {
      console.error(
        "POSTGRES_PASSWORD 또는 DATABASE_URL 이 필요합니다.\n" +
          "  .env.production 의 POSTGRES_PASSWORD 를 확인하세요.\n" +
          "  또는 .env 에 다음을 추가:\n" +
          '  DATABASE_URL="postgresql://intranet:<비밀번호>@127.0.0.1:5432/intranet?schema=public"',
      );
      process.exit(1);
    }
    databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${db}?schema=public`;
  }

  if (databaseUrl.includes("postgresql://postgres@") || databaseUrl.includes("://postgres:")) {
    console.warn(
      "[경고] DATABASE_URL 사용자가 postgres 입니다. Docker 스택은 보통 intranet 사용자입니다.",
    );
  }

  // Prisma CLI / seed 가 읽을 수 있도록 .env 에 DATABASE_URL 보정(없을 때만 append 하지 않고 메모리로 전달)
  const env = {
    ...merged,
    DATABASE_URL: databaseUrl,
  };

  // Windows: .env 에 DATABASE_URL 없으면 다음 실행을 위해 기록해 둔다
  const envPath = path.join(root, ".env");
  if (!fromDot.DATABASE_URL) {
    const line = `DATABASE_URL="${databaseUrl}"\n`;
    if (existsSync(envPath)) {
      const cur = readFileSync(envPath, "utf8");
      if (!/^DATABASE_URL=/m.test(cur)) {
        writeFileSync(envPath, cur.replace(/\s*$/, "\n") + line, "utf8");
        console.log("✓ .env 에 DATABASE_URL 추가");
      }
    } else {
      writeFileSync(
        envPath,
        `# office host → docker postgres\nDATABASE_URL="${databaseUrl}"\n`,
        "utf8",
      );
      console.log("✓ .env 생성 (DATABASE_URL)");
    }
  }

  console.log(`DATABASE_URL host=${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
  run("npx", ["prisma", "migrate", "deploy"], env);
  run("npx", ["tsx", "prisma/seed.ts"], env);
  console.log("\n✓ migrate + seed 완료");
  console.log("  로그인: admin@intranet.local / password1234");
  console.log("  URL:    http://192.168.0.16:8080  (Docker Nginx — :3000 아님)");
  console.log("\n※ 사이드바에 「일정」이 없으면 앱 이미지를 다시 빌드해야 합니다:");
  console.log("   npm run docker:sync");
  console.log("   또는 scripts\\office-sync.cmd");
}

main();
