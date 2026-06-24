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
exec node /app/server.js
