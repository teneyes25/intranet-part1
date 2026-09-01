#!/bin/sh
set -e

echo "[entrypoint] enabling pgvector extension..."
node <<'NODE'
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const prisma = new PrismaClient();
prisma
  .$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector")
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
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
    node /app/node_modules/prisma/build/index.js db push $PUSH_FLAGS
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
  if ! node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts; then
    echo "[entrypoint] ERROR: seed failed — admin@intranet.local 로그인이 안 될 수 있습니다."
    echo "[entrypoint] 호스트에서: npm run office:reset-admin 또는 npm run office:db-seed"
  else
    echo "[entrypoint] seed OK — admin@intranet.local / password1234"
  fi
fi

if [ "${RUN_DEALER_DEMO_SEED}" = "true" ]; then
  echo "[entrypoint] dealer demo seeding..."
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed-dealer-demo.ts || echo "[entrypoint] dealer demo seed skipped"
fi

echo "[entrypoint] ensuring writable AI cache dirs..."
mkdir -p /app/uploads/hf-cache/hub /app/uploads/hf-cache/xdg /tmp/hf-cache/hub /tmp/hf-cache/xdg 2>/dev/null || true

echo "[entrypoint] starting server on port ${PORT:-3000}..."
# health 체크로 cron 폴백 등록 (instrumentation 보조)
( sleep 8 && wget -q -O- "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null 2>&1 || true ) &
exec node /app/server.js
