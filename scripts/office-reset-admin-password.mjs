#!/usr/bin/env node
/**
 * 초기 관리자(admin@intranet.local) 비밀번호를 password1234 로 복구.
 * usage: npm run office:reset-admin
 *
 * - Docker Postgres(intranet 사용자, 127.0.0.1:5432) 대상
 * - .env 의 postgres@localhost 는 무시하고 .env.production POSTGRES_* 사용
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveOfficeDatabaseUrl } from "./lib/office-db-url.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_EMAIL = "admin@intranet.local";
const ADMIN_PASSWORD = "password1234";

async function main() {
  const { databaseUrl, env } = resolveOfficeDatabaseUrl(root);
  Object.assign(process.env, env);
  console.log(`DATABASE_URL host=${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);

  let PrismaClient;
  let bcrypt;
  try {
    ({ PrismaClient } = require("@prisma/client"));
    bcrypt = require("bcryptjs");
  } catch {
    console.log("> npx prisma generate");
    const g = spawnSync("npx", ["prisma", "generate"], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      shell: true,
    });
    if (g.status !== 0) process.exit(g.status ?? 1);
    ({ PrismaClient } = require("@prisma/client"));
    bcrypt = require("bcryptjs");
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        name: "시스템 관리자",
        role: "ADMIN",
        passwordHash,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: false,
        passwordChangedAt: null,
      },
      create: {
        email: ADMIN_EMAIL,
        name: "시스템 관리자",
        role: "ADMIN",
        passwordHash,
        isActive: true,
        approvalStatus: "APPROVED",
        mustChangePassword: false,
      },
      select: { id: true, email: true, role: true, isActive: true },
    });

    console.log("\n✓ 관리자 비밀번호 복구 완료");
    console.log(`  email:    ${user.email}`);
    console.log(`  password: ${ADMIN_PASSWORD}`);
    console.log("  URL:      http://192.168.0.16:8080  (:3000 아님)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
