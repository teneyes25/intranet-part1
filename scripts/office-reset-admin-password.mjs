#!/usr/bin/env node
/**
 * 초기 관리자(admin@intranet.local) 비밀번호를 password1234 로 복구.
 * usage: npm run office:reset-admin
 *
 * - Docker Postgres(intranet 사용자, 127.0.0.1:5432) 대상
 * - 계정 없으면 생성(승인·활성)
 * - mustChangePassword=false (바로 로그인 가능)
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN_EMAIL = "admin@intranet.local";
const ADMIN_PASSWORD = "password1234";

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

function resolveDatabaseUrl() {
  const fromDot = loadEnvFile(path.join(root, ".env"));
  const fromProd = loadEnvFile(path.join(root, ".env.production"));
  const merged = { ...fromProd, ...fromDot, ...process.env };

  const user = merged.POSTGRES_USER || "intranet";
  const password = merged.POSTGRES_PASSWORD || "";
  const db = merged.POSTGRES_DB || "intranet";
  const port = merged.POSTGRES_PORT || "5432";

  let databaseUrl = merged.DATABASE_URL || "";
  if (!databaseUrl || databaseUrl.includes("@db:")) {
    if (!password) {
      console.error(
        "POSTGRES_PASSWORD 또는 DATABASE_URL 이 필요합니다.\n" +
          "  .env.production 의 POSTGRES_PASSWORD 를 확인한 뒤 다시 실행하세요.",
      );
      process.exit(1);
    }
    databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${db}?schema=public`;
  }

  const envPath = path.join(root, ".env");
  if (!fromDot.DATABASE_URL) {
    const line = `DATABASE_URL="${databaseUrl}"\n`;
    if (existsSync(envPath)) {
      const cur = readFileSync(envPath, "utf8");
      if (!/^DATABASE_URL=/m.test(cur)) {
        writeFileSync(envPath, cur.replace(/\s*$/, "\n") + line, "utf8");
      }
    } else {
      writeFileSync(
        envPath,
        `# office host → docker postgres\nDATABASE_URL="${databaseUrl}"\n`,
        "utf8",
      );
    }
  }

  return databaseUrl;
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;
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
