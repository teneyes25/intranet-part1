#!/usr/bin/env node
/**
 * 스모크 테스트 — health + Phase 5 보안·커스터마이징 엔드포인트
 * node scripts/smoke-test.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");

async function get(path) {
  const url = `${base}${path}`;
  console.log(`[smoke] GET ${url}`);
  const res = await fetch(url);
  return { res, body: res.headers.get("content-type")?.includes("json") ? await res.json() : null };
}

async function post(path, data) {
  const url = `${base}${path}`;
  console.log(`[smoke] POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { res, body: res.headers.get("content-type")?.includes("json") ? await res.json() : null };
}

async function main() {
  const { res: healthRes, body: health } = await get("/api/health");
  console.log(JSON.stringify(health, null, 2));
  if (!healthRes.ok) {
    console.error("[smoke] health failed");
    process.exit(1);
  }
  if (health.checks?.database !== "ok") {
    console.error("[smoke] database check failed");
    process.exit(1);
  }

  const { res: brandingRes } = await get("/api/branding/asset?asset=invalid");
  if (brandingRes.status !== 400) {
    console.error(`[smoke] branding invalid asset expected 400, got ${brandingRes.status}`);
    process.exit(1);
  }

  const { res: ingestRes } = await post("/api/ai/ingest", { scope: "all" });
  if (ingestRes.status !== 401) {
    console.error(`[smoke] ai ingest unauth expected 401, got ${ingestRes.status}`);
    process.exit(1);
  }

  const { res: registerRes } = await post("/api/auth/register", {
    name: "smoke",
    email: "not-an-email",
    password: "short",
  });
  if (registerRes.status !== 400) {
    console.error(`[smoke] register validation expected 400, got ${registerRes.status}`);
    process.exit(1);
  }

  console.log("[smoke] OK — health, branding guard, ai ingest auth, register validation");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
