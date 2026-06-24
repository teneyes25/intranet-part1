#!/usr/bin/env node
/**
 * Load Test — 동시 접속 (기본 50, Phase 9: 200명)
 * node scripts/load-test.mjs [baseUrl] [concurrency] [durationSec]
 * 예: npm run load-test -- http://localhost:8080 200 45
 */
const base = process.argv[2] ?? "http://localhost:8080";
const concurrency = Number(process.argv[3] ?? 50);
const durationSec = Number(process.argv[4] ?? 30);

const url = `${base.replace(/\/$/, "")}/api/health`;

let ok = 0;
let fail = 0;
let latencies = [];

async function worker(id, endAt) {
  while (Date.now() < endAt) {
    const t0 = performance.now();
    try {
      const res = await fetch(url);
      const ms = performance.now() - t0;
      latencies.push(ms);
      if (res.ok) ok++;
      else fail++;
    } catch {
      fail++;
    }
  }
}

async function main() {
  console.log(`[load] ${concurrency} workers × ${durationSec}s → ${url}`);
  const endAt = Date.now() + durationSec * 1000;
  await Promise.all(
    Array.from({ length: concurrency }, (_, i) => worker(i, endAt)),
  );
  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const avg = latencies.length
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  console.log(`[load] OK=${ok} FAIL=${fail} avg=${avg.toFixed(0)}ms p95=${p95.toFixed(0)}ms`);
  if (fail > ok * 0.05) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
