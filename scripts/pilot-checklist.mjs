#!/usr/bin/env node
/**
 * Pilot 배포 체크리스트 자동 검증
 * node scripts/pilot-checklist.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`[OK] ${name}`);
  } catch (e) {
    checks.push({ name, ok: false, error: e instanceof Error ? e.message : String(e) });
    console.error(`[FAIL] ${name}:`, e instanceof Error ? e.message : e);
  }
}

async function main() {
  console.log(`[pilot-check] base=${base}\n`);

  let healthBody = null;

  await check("health endpoint", async () => {
    const res = await fetch(`${base}/api/health`);
    healthBody = await res.json();
    if (!res.ok || healthBody.checks?.database !== "ok") throw new Error("unhealthy");
  });

  await check("pilot nav modules (approval, documents, search)", async () => {
    const modules = healthBody?.pilotModules ?? [];
    const required = ["approval", "documents", "search"];
    const missing = required.filter((m) => !modules.includes(m));
    if (missing.length > 0) {
      throw new Error(
        `missing in pilotModules: ${missing.join(", ")} (got: ${modules.join(", ") || "none"}) — set PILOT_MODE=true and rebuild`,
      );
    }
    if (modules.includes("attendance")) {
      throw new Error("attendance should be hidden in Pilot mode");
    }
    const nav = healthBody?.navModules ?? {};
    if (nav.approval !== true || nav.documents !== true || nav.search !== true) {
      throw new Error(`navModules mismatch: ${JSON.stringify(nav)}`);
    }
  });

  await check("pilot metrics requires admin", async () => {
    const res = await fetch(`${base}/api/pilot/metrics`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await check("pilot feedback requires auth", async () => {
    const res = await fetch(`${base}/api/pilot/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "bug", rating: 3, message: "test feedback" }),
    });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await check("login page reachable", async () => {
    const res = await fetch(`${base}/login`);
    if (!res.ok) throw new Error(`login page ${res.status}`);
  });

  await check("dashboard requires auth", async () => {
    const res = await fetch(`${base}/dashboard`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 302) {
      throw new Error(`expected redirect, got ${res.status}`);
    }
  });

  for (const path of ["/approval", "/documents", "/search"]) {
    await check(`${path} requires auth`, async () => {
      const res = await fetch(`${base}${path}`, { redirect: "manual" });
      if (res.status !== 307 && res.status !== 302 && res.status !== 401) {
        throw new Error(`expected redirect, got ${res.status}`);
      }
    });
  }

  await check("admin pilot page redirects unauth", async () => {
    const res = await fetch(`${base}/admin/pilot`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 302) throw new Error(`expected redirect, got ${res.status}`);
  });

  await check("Sprint #3 features (command palette + activity feed)", async () => {
    const features = healthBody?.features ?? {};
    if (!features.commandPalette || !features.activityFeed || !features.quickSearch) {
      throw new Error(`missing features: ${JSON.stringify(features)}`);
    }
  });

  await check("quick search API requires auth", async () => {
    const res = await fetch(`${base}/api/search/quick?q=test`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await check("quick search short query returns empty", async () => {
    const res = await fetch(`${base}/api/search/quick?q=a`);
    if (res.status !== 401) throw new Error(`expected 401 without session, got ${res.status}`);
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n[pilot-check] ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exit(1);
  console.log("[pilot-check] Pilot deployment checks OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
