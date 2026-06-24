#!/usr/bin/env node
/**
 * Phase 9 Final verification orchestrator
 * node scripts/final-check.mjs [baseUrl]
 *
 * Runs smoke + production-check. For full suite also run:
 *   npm run typecheck && npm run build && npm run test:e2e
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:8080";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n❌ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
  console.log(`✅ ${label}`);
}

console.log(`[final-check] Phase 9 — ${base}\n`);

run("smoke", "node", ["scripts/smoke-test.mjs", base]);
run("production-check", "node", ["scripts/production-check.mjs", base]);

console.log(`
[final-check] Automated checks passed.

Next (manual / CI):
  npm run typecheck
  npm run build
  npm run test:e2e
  npm run load-test -- ${base} 200 45
`);
