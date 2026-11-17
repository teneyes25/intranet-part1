#!/bin/sh
set -e

echo "[entrypoint] waiting for database..."
i=0
until node <<'NODE'
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const prisma = new PrismaClient();
prisma
  .$queryRawUnsafe("SELECT 1")
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    try { await prisma.$disconnect(); } catch {}
    console.error("[entrypoint] db not ready:", err.message || err);
    process.exit(1);
  });
NODE
do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[entrypoint] database not reachable after 60 attempts — abort"
    exit 1
  fi
  echo "[entrypoint] db retry $i/60..."
  sleep 2
done
echo "[entrypoint] database OK"

echo "[entrypoint] enabling pgvector extension..."
node <<'NODE'
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("[entrypoint] pgvector OK");
  } catch (err) {
    // 이미 설치됐거나 권한 부족이어도, vector 타입이 있으면 계속 진행
    try {
      await prisma.$queryRawUnsafe("SELECT 'vector'::regtype");
      console.warn("[entrypoint] CREATE EXTENSION failed but vector type exists — continue");
      console.warn(String(err && err.message ? err.message : err));
    } catch (err2) {
      console.error("[entrypoint] pgvector unavailable:", err);
      console.error(err2);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
NODE

echo "[entrypoint] DB schema sync (production-safe)..."

# 1) prisma migrate deploy (권장 — 데이터 손실 없음)
# 2) 실패 시 db push (PRISMA_ACCEPT_DATA_LOSS=true 일 때만 --accept-data-loss)
if [ "${PRISMA_MIGRATE_DEPLOY:-true}" = "true" ]; then
  if node /app/node_modules/prisma/build/index.js migrate deploy; then
    echo "[entrypoint] migrate deploy OK"
  else
    echo "[entrypoint] migrate deploy failed — fallback to db push"
    PUSH_FLAGS="--skip-generate"
    if [ "${PRISMA_ACCEPT_DATA_LOSS:-false}" = "true" ]; then
      PUSH_FLAGS="$PUSH_FLAGS --accept-data-loss"
      echo "[entrypoint] WARNING: PRISMA_ACCEPT_DATA_LOSS=true"
    fi
    if ! node /app/node_modules/prisma/build/index.js db push $PUSH_FLAGS; then
      echo "[entrypoint] FATAL: migrate deploy and db push both failed"
      echo "[entrypoint] Check: docker compose logs app — migration / schema errors"
      exit 1
    fi
  fi
else
  PUSH_FLAGS="--skip-generate"
  if [ "${PRISMA_ACCEPT_DATA_LOSS:-false}" = "true" ]; then
    PUSH_FLAGS="$PUSH_FLAGS --accept-data-loss"
  fi
  node /app/node_modules/prisma/build/index.js db push $PUSH_FLAGS
fi

if [ "${RUN_SEED}" = "true" ]; then
  echo "[entrypoint] seeding..."
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts || echo "[entrypoint] seed skipped"
fi

if [ "${RUN_DEMO_SEED}" = "true" ]; then
  echo "[entrypoint] demo seeding (Pilot)..."
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed-demo.ts || echo "[entrypoint] demo seed skipped"
fi

if [ "${RUN_DEALER_DEMO_SEED}" = "true" ]; then
  echo "[entrypoint] dealer demo seeding (Phase 8)..."
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed-dealer-demo.ts || echo "[entrypoint] dealer demo seed skipped"
fi

echo "[entrypoint] starting server on port ${PORT:-3000}..."
# health 체크로 cron 폴백 등록 (instrumentation 보조)
( sleep 8 && wget -q -O- "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null 2>&1 || true ) &
exec node /app/server.js
