#!/bin/sh
# 기존 db push DB에 production baseline 마이그레이션 등록
# 사용: docker compose exec app sh /app/scripts/resolve-migration-baseline.sh
set -e
node /app/node_modules/prisma/build/index.js migrate resolve --applied 20250621120000_production_baseline
node /app/node_modules/prisma/build/index.js migrate deploy
echo "[baseline] done — PRISMA_MIGRATE_DEPLOY=true 유지 가능"
