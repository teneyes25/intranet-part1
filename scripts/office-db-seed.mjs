#!/usr/bin/env node
/**
 * 사무실 PC(Windows 포함)에서 Docker Postgres 에 migrate + seed.
 * usage: npm run office:db-seed
 *
 * - .env.production POSTGRES_* (intranet 사용자) 기준
 * - .env 의 postgres@localhost 는 무시·교정
 * - 호스트→컨테이너 DB 는 127.0.0.1:5432
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveOfficeDatabaseUrl } from "./lib/office-db-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  const { databaseUrl, env } = resolveOfficeDatabaseUrl(root);
  console.log(`DATABASE_URL host=${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);
  run("npx", ["prisma", "generate"], env);
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
