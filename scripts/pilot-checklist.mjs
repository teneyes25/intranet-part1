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

  await check("health endpoint", async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    if (!res.ok || body.checks?.database !== "ok") throw new Error("unhealthy");
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

  await check("admin pilot page redirects unauth", async () => {
    const res = await fetch(`${base}/admin/pilot`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 302) throw new Error(`expected redirect, got ${res.status}`);
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
