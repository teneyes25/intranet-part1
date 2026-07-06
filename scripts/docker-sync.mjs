#!/usr/bin/env node
/**
 * 코드 변경 후 Docker(8080)에 즉시 반영 + 캐시 강제 무효화
 * usage: npm run docker:sync
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildId = `${Date.now().toString(36)}`;
const appVersion = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, BUILD_ID: buildId, NEXT_PUBLIC_BUILD_ID: buildId, APP_VERSION: appVersion, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function waitHealthy(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const res = await fetch("http://localhost:8080/api/health", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("✓ healthy:", data.status, "buildId:", buildId);
        return true;
      }
    } catch {
      /* app/nginx 기동 대기 */
    }
  }
  return false;
}

async function verifyPages() {
  const urls = ["/login", "/api/health"];
  for (const u of urls) {
    try {
      const res = await fetch(`http://localhost:8080${u}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      console.log(`✓ ${u} → ${res.status}`);
    } catch (e) {
      console.warn(`⚠ ${u} verify failed:`, e.message);
    }
  }
}

async function main() {
  console.log("=== Docker sync → http://localhost:8080 ===");
  console.log(`BUILD_ID=${buildId} APP_VERSION=${appVersion}`);

  const composeBase = ["compose", "--env-file", ".env.production"];

  writeFileSync(
    path.join(root, ".build-id"),
    `${buildId}\n`,
    "utf8",
  );

  run("docker", [
    ...composeBase,
    "build",
    "--no-cache",
    "--build-arg",
    `BUILD_ID=${buildId}`,
    "--build-arg",
    `APP_VERSION=${appVersion}`,
    "app",
  ]);
  run("docker", [...composeBase, "up", "-d", "--force-recreate", "app"]);

  console.log("\nRestarting nginx (app recreate 후 upstream 갱신)...");
  run("docker", [...composeBase, "up", "-d", "--force-recreate", "nginx"]);

  console.log("\nWaiting for health @ :8080...");
  const ok = await waitHealthy();
  if (!ok) {
    console.error("Health check timed out — check: docker compose logs app nginx");
    process.exit(1);
  }

  await verifyPages();

  try {
    const health = await fetch("http://localhost:8080/api/health", { cache: "no-store" });
    const data = await health.json();
    console.log(`\n  version=${data.version} pilotMode=${data.pilotMode} buildId=${data.buildId}`);
    if (data.pilotMode !== true) {
      console.warn("⚠ PILOT_MODE가 false입니다 — .env.production 확인");
    }
  } catch {
    /* ignore */
  }

  console.log("\n✓ 배포 완료. 브라우저에서 Ctrl+Shift+R 또는 시크릿 창으로 확인하세요.");
  console.log(`  BUILD_ID=${buildId}`);
}

main();
