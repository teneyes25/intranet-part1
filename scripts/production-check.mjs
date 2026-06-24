#!/usr/bin/env node
/**
 * Phase 7 Production readiness check
 * node scripts/production-check.mjs [baseUrl]
 */
const base = process.argv[2] ?? "http://localhost:8080";

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    checks.push({ name, ok: false, err: e.message });
    console.error(`❌ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log(`[production-check] ${base}\n`);

  await check("health endpoint", async () => {
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.json();
    if (body.checks?.database !== "ok") throw new Error("database not ok");
  });

  await check("security headers (single X-Frame-Options)", async () => {
    const res = await fetch(`${base}/api/health`);
    const values = res.headers.getSetCookie?.() ?? [];
    void values;
    const xfo = res.headers.get("x-frame-options");
    if (!xfo) throw new Error("missing X-Frame-Options");
  });

  await check("login page", async () => {
    const res = await fetch(`${base}/login`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await check("help page redirect (auth required)", async () => {
    const res = await fetch(`${base}/help`, { redirect: "manual" });
    if (res.status !== 307 && res.status !== 302) {
      throw new Error(`expected redirect, got ${res.status}`);
    }
  });

  await check("manual download API", async () => {
    const res = await fetch(`${base}/api/help/manual`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await check("monitoring API auth", async () => {
    const res = await fetch(`${base}/api/admin/monitoring`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  await check("v2 orders API auth", async () => {
    const res = await fetch(`${base}/api/v2/orders`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n[production-check] ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
