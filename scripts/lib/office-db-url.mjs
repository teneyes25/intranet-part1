/**
 * 사무실 PC → Docker Postgres 접속 URL 해석.
 * - compose 앱은 @db:5432 / intranet 사용자
 * - 호스트 스크립트는 127.0.0.1:5432 / intranet 사용자
 * - .env 에 남은 postgres@localhost 는 무시하고 .env.production POSTGRES_* 로 교체
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function stripQuotes(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

export function loadEnvFile(file) {
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

function dbUserFromUrl(url) {
  try {
    return decodeURIComponent(new URL(url).username || "");
  } catch {
    const m = String(url).match(/^postgres(?:ql)?:\/\/([^:@/]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }
}

function isUnusableHostUrl(url) {
  if (!url) return true;
  if (url.includes("@db:") || url.includes("@db/")) return true;
  const user = dbUserFromUrl(url);
  // 로컬/다른 도구가 넣은 postgres 슈퍼유저 — Docker 인트라넷 DB 와 다름
  if (user === "postgres") return true;
  return false;
}

function buildHostUrl(user, password, db, port) {
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${db}?schema=public`;
}

function rewriteEnvDatabaseUrl(envPath, databaseUrl) {
  const line = `DATABASE_URL="${databaseUrl}"`;
  if (!existsSync(envPath)) {
    writeFileSync(
      envPath,
      `# office host → docker postgres (intranet user)\n${line}\n`,
      "utf8",
    );
    console.log("✓ .env 생성 (DATABASE_URL=intranet@127.0.0.1)");
    return;
  }
  const cur = readFileSync(envPath, "utf8");
  if (/^DATABASE_URL=/m.test(cur)) {
    writeFileSync(
      envPath,
      cur.replace(/^DATABASE_URL=.*$/m, line),
      "utf8",
    );
    console.log("✓ .env DATABASE_URL 을 Docker intranet 사용자로 수정");
  } else {
    writeFileSync(envPath, cur.replace(/\s*$/, "\n") + `${line}\n`, "utf8");
    console.log("✓ .env 에 DATABASE_URL 추가");
  }
}

/**
 * @param {string} root repo root
 * @returns {{ databaseUrl: string, env: Record<string, string> }}
 */
export function resolveOfficeDatabaseUrl(root) {
  const envPath = path.join(root, ".env");
  const prodPath = path.join(root, ".env.production");
  const fromDot = loadEnvFile(envPath);
  const fromProd = loadEnvFile(prodPath);

  // Docker 자격 증명은 .env.production 이 기준 (.env 의 잘못된 DATABASE_URL 보다 우선)
  const user =
    fromProd.POSTGRES_USER ||
    fromDot.POSTGRES_USER ||
    process.env.POSTGRES_USER ||
    "intranet";
  const password =
    fromProd.POSTGRES_PASSWORD ||
    fromDot.POSTGRES_PASSWORD ||
    process.env.POSTGRES_PASSWORD ||
    "";
  const db =
    fromProd.POSTGRES_DB ||
    fromDot.POSTGRES_DB ||
    process.env.POSTGRES_DB ||
    "intranet";
  const port =
    fromProd.POSTGRES_PORT ||
    fromDot.POSTGRES_PORT ||
    process.env.POSTGRES_PORT ||
    "5432";

  const candidate =
    process.env.DATABASE_URL || fromDot.DATABASE_URL || fromProd.DATABASE_URL || "";

  let databaseUrl = candidate;
  let rebuilt = false;

  if (isUnusableHostUrl(databaseUrl)) {
    if (!password) {
      console.error(
        "사무실 Docker DB 접속 정보를 만들 수 없습니다.\n" +
          "  .env.production 에 POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB 를 확인하세요.\n" +
          "  (앱 컨테이너는 intranet 사용자 — postgres@localhost 가 아닙니다)\n" +
          '  예: DATABASE_URL="postgresql://intranet:<비밀번호>@127.0.0.1:5432/intranet?schema=public"',
      );
      if (candidate && dbUserFromUrl(candidate) === "postgres") {
        console.error(
          `\n  현재 무시된 DATABASE_URL 사용자: postgres (호스트=${candidate.replace(/:[^:@/]+@/, ":***@")})`,
        );
      }
      process.exit(1);
    }
    if (candidate && dbUserFromUrl(candidate) === "postgres") {
      console.warn(
        "[office] .env DATABASE_URL 이 postgres@localhost 입니다 — Docker intranet 사용자로 교체합니다.",
      );
    }
    databaseUrl = buildHostUrl(user, password, db, port);
    rebuilt = true;
  }

  if (rebuilt || !fromDot.DATABASE_URL || isUnusableHostUrl(fromDot.DATABASE_URL)) {
    rewriteEnvDatabaseUrl(envPath, databaseUrl);
  }

  const merged = {
    ...fromProd,
    ...fromDot,
    ...process.env,
    POSTGRES_USER: user,
    POSTGRES_PASSWORD: password,
    POSTGRES_DB: db,
    POSTGRES_PORT: port,
    DATABASE_URL: databaseUrl,
  };

  return { databaseUrl, env: merged };
}
