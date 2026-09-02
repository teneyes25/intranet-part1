#!/usr/bin/env node
/**
 * 코드 변경 후 Docker(8080)에 즉시 반영 + 캐시 강제 무효화
 * usage: npm run docker:sync
 *
 * Cloud Agent / 중첩 Docker 에서는 host-network compose 를 자동 감지한다.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = `${Date.now().toString(36)}`;
const envFile = path.join(root, ".env.production");
const hostOverlay = path.join(root, "docker-compose.host.yml");

/** INTRANET_LAN_IP 가 있으면 .env.production 의 공개 URL을 맞춘다. */
function applyLanIpToEnv() {
  const lanIp = process.env.INTRANET_LAN_IP?.trim();
  if (!lanIp || !existsSync(envFile)) return null;
  const httpPort = process.env.HTTP_PORT?.trim() || "8080";
  const base = `http://${lanIp}:${httpPort}`;
  let text = readFileSync(envFile, "utf8");
  text = text.replace(/^NEXTAUTH_URL=.*$/m, `NEXTAUTH_URL=${base}`);
  text = text.replace(
    /^ALLOWED_ORIGINS=.*$/m,
    `ALLOWED_ORIGINS=${base},http://localhost:${httpPort},http://127.0.0.1:${httpPort}`,
  );
  writeFileSync(envFile, text, "utf8");
  console.log(`[docker-sync] NEXTAUTH_URL → ${base}`);
  return base;
}

function detectComposeArgs() {
  const args = ["compose"];
  args.push("-f", "docker-compose.yml");

  let useHost = process.env.INTRANET_COMPOSE_MODE === "host";
  if (!useHost && process.env.INTRANET_COMPOSE_MODE !== "bridge") {
    // 실행 중 app 이 host 네트워크면 host overlay 유지
    const inspect = spawnSync(
      "docker",
      ["inspect", "intranet-app", "--format", "{{.HostConfig.NetworkMode}}"],
      { cwd: root, encoding: "utf8" },
    );
    const mode = (inspect.stdout || "").trim();
    if (mode === "host" && existsSync(hostOverlay)) useHost = true;
    // Cloud Agent 기본: bridge 가 막힌 경우가 많아 host overlay 가 있으면 우선
    if (
      !useHost &&
      existsSync(hostOverlay) &&
      (process.env.CURSOR_AGENT || process.env.CURSOR_CLOUD_AGENT)
    ) {
      useHost = true;
    }
  }

  if (useHost && existsSync(hostOverlay)) {
    args.push("-f", "docker-compose.host.yml");
  }
  if (existsSync(envFile)) {
    args.push("--env-file", ".env.production");
  }
  return { args, useHost };
}

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, BUILD_ID: buildId, NEXT_PUBLIC_BUILD_ID: buildId, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function waitHealthy(maxAttempts = 45) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const res = await fetch("http://127.0.0.1:8080/api/health", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        console.log(
          "✓ healthy:",
          data.status,
          "buildId:",
          data.buildId ?? "(none)",
          "expected:",
          buildId,
        );
        return data;
      }
    } catch {
      /* app/nginx 기동 대기 */
    }
  }
  return null;
}

async function ensureMessengerMigrated() {
  const check = spawnSync(
    "docker",
    [
      "exec",
      "intranet-db",
      "psql",
      "-U",
      "intranet",
      "-d",
      "intranet",
      "-tAc",
      "SELECT to_regclass('public.messenger_profiles')",
    ],
    { cwd: root, encoding: "utf8" },
  );
  const name = (check.stdout || "").trim();
  if (name.includes("messenger_profiles")) {
    console.log("✓ messenger_profiles table present");
    return;
  }
  console.warn(
    "⚠ messenger_profiles 없음 — 컨테이너 재시작 후 migrate 를 다시 확인하세요. docker logs intranet-app --tail 80",
  );
}

async function verifyPages() {
  const urls = ["/login", "/api/health", "/boards/schedule", "/messenger"];
  for (const u of urls) {
    try {
      const res = await fetch(`http://127.0.0.1:8080${u}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        redirect: "manual",
      });
      console.log(`✓ ${u} → ${res.status}`);
    } catch (e) {
      console.warn(`⚠ ${u} verify failed:`, e.message);
    }
  }
}

async function ensureScheduleBoardSeeded() {
  const check = spawnSync(
    "docker",
    [
      "exec",
      "intranet-db",
      "psql",
      "-U",
      "intranet",
      "-d",
      "intranet",
      "-tAc",
      "SELECT COUNT(*) FROM boards WHERE key = 'schedule'",
    ],
    { cwd: root, encoding: "utf8" },
  );
  const count = Number((check.stdout || "").trim());
  if (Number.isFinite(count) && count > 0) {
    console.log("✓ schedule board already in DB");
    return;
  }
  console.log("… inserting schedule board");
  const sql = `
INSERT INTO boards (id, key, name, description, categories, "writeRoles", "allowComments", "createdAt", "updatedAt")
VALUES (
  'board_schedule_seed',
  'schedule',
  '일정',
  '사내 일정·회의·마감을 달력으로 확인합니다',
  ARRAY['회의','행사','마감','기타']::text[],
  ARRAY[]::\"Role\"[],
  true,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  categories = EXCLUDED.categories,
  "updatedAt" = NOW();
`;
  const ins = spawnSync(
    "docker",
    ["exec", "-i", "intranet-db", "psql", "-U", "intranet", "-d", "intranet", "-v", "ON_ERROR_STOP=1"],
    { cwd: root, encoding: "utf8", input: sql },
  );
  if (ins.status !== 0) {
    console.warn("⚠ schedule board insert failed:", ins.stderr || ins.stdout);
    return;
  }
  console.log("✓ schedule board inserted");
}


async function main() {
  const messengerSrc = path.join(root, "src", "features", "messenger", "constants.ts");
  if (!existsSync(messengerSrc)) {
    console.error(
      "✗ 사내 메신저 코드가 없습니다. 먼저 이 명령을 실행하세요:\n" +
        "  git fetch origin cursor/admin-user-board-mgmt-0c07\n" +
        "  git checkout -B cursor/admin-user-board-mgmt-0c07 origin/cursor/admin-user-board-mgmt-0c07\n" +
        "  git reset --hard origin/cursor/admin-user-board-mgmt-0c07\n" +
        "  그다음 scripts\\office-sync.cmd",
    );
    process.exit(1);
  }

  const lanBase = applyLanIpToEnv();
  const { args: composeBase, useHost } = detectComposeArgs();
  console.log("=== Docker sync → http://127.0.0.1:8080 ===");
  if (lanBase) console.log(`LAN URL: ${lanBase}`);
  console.log(`BUILD_ID=${buildId} (캐시 버스트)`);
  console.log(`compose mode: ${useHost ? "host" : "bridge"}`);

  writeFileSync(path.join(root, ".build-id"), `${buildId}\n`, "utf8");

  run("docker", [
    ...composeBase,
    "build",
    "--build-arg",
    `BUILD_ID=${buildId}`,
    "app",
  ]);
  run("docker", [...composeBase, "up", "-d", "--force-recreate", "app"]);

  console.log("\nWaiting for app health (before nginx)...");
  let health = await waitHealthy();
  if (!health) {
    console.error("Health check timed out — check: docker compose logs app");
    process.exit(1);
  }

  run("docker", [...composeBase, "up", "-d", "--force-recreate", "nginx"]);

  console.log("\nRe-check after nginx restart...");
  health = await waitHealthy(15);
  if (!health) {
    console.error("Health check failed after nginx recreate");
    process.exit(1);
  }

  await ensureScheduleBoardSeeded();
  await ensureMessengerMigrated();
  await verifyPages();

  if (health.buildId && health.buildId !== buildId) {
    console.warn(
      `⚠ health buildId(${health.buildId}) ≠ expected(${buildId}) — 캐시/구 이미지일 수 있음`,
    );
  }

  console.log("\n✓ 배포 완료. 브라우저에서 Ctrl+Shift+R 또는 시크릿 창으로 확인하세요.");
  console.log(`  local: http://127.0.0.1:8080/boards/schedule`);
  if (lanBase) console.log(`  LAN:   ${lanBase}/boards/schedule`);
  console.log(`  BUILD_ID=${buildId}`);
}

main();
