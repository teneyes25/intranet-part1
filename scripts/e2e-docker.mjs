#!/usr/bin/env node
/**
 * Docker(8080) 기동 후 Frontend E2E 전체 스위트 실행
 * node scripts/e2e-docker.mjs [baseUrl]
 *
 * 순서: health → smoke → ui-upgrade → ui-phase4 → (선택) real-usage
 */
import { spawnSync } from "node:child_process";

const base = (process.argv.find((a) => a.startsWith("http")) ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "http://localhost:8080").replace(/\/$/, "");

const includeFull = process.argv.includes("--full") || process.env.E2E_INCLUDE_REAL_USAGE === "true";

const suites = [
  { name: "smoke", files: ["e2e/smoke.spec.ts"] },
  { name: "ui-upgrade", files: ["e2e/ui-upgrade.spec.ts"] },
  { name: "ui-phase4", files: ["e2e/ui-phase4.spec.ts"] },
];

if (includeFull) {
  suites.push({ name: "real-usage", files: ["e2e/real-usage.spec.ts"] });
}

async function healthCheck() {
  const res = await fetch(`${base}/api/health`);
  const body = await res.json();
  if (!res.ok || body.status !== "healthy") {
    throw new Error(`health check failed: ${res.status} ${JSON.stringify(body)}`);
  }
  console.log(`[e2e-docker] health OK @ ${base}`);
}

function runPlaywright(files) {
  const result = spawnSync(
    "npx",
    ["playwright", "test", ...files],
    {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, PLAYWRIGHT_BASE_URL: base },
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function ensurePlaywrightBrowser() {
  const { chromium } = await import("@playwright/test");
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch {
    console.log("[e2e-docker] Playwright browser missing — running: npx playwright install chromium");
    const install = spawnSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
      shell: true,
    });
    if (install.status !== 0) {
      console.error("[e2e-docker] playwright install failed. Run: npx playwright install chromium");
      process.exit(1);
    }
  }
}

async function main() {
  console.log(`[e2e-docker] base=${base}\n`);

  try {
    await healthCheck();
  } catch (e) {
    console.error("[e2e-docker] Docker가 :8080에서 기동 중인지 확인하세요.");
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  await ensurePlaywrightBrowser();

  for (const suite of suites) {
    console.log(`\n[e2e-docker] ▶ ${suite.name} (${suite.files.join(", ")})`);
    runPlaywright(suite.files);
    console.log(`[e2e-docker] ✓ ${suite.name} passed`);
  }

  console.log(`\n[e2e-docker] All ${suites.length} suite(s) passed @ ${base}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
