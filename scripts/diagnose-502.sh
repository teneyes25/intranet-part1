#!/usr/bin/env bash
# 본사 서버에서 8080 502 Bad Gateway 진단
# usage: bash scripts/diagnose-502.sh
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== docker compose ps ==="
docker compose ps || docker-compose ps || true

echo
echo "=== app last 120 log lines ==="
docker compose logs --tail=120 app 2>/dev/null || docker logs --tail=120 intranet-app 2>/dev/null || true

echo
echo "=== nginx last 40 log lines ==="
docker compose logs --tail=40 nginx 2>/dev/null || docker logs --tail=40 intranet-nginx 2>/dev/null || true

echo
echo "=== app health from inside compose network ==="
docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(r.status, await r.text())}).catch(e=>{console.error('FAIL', e.message); process.exit(1)})" \
  2>/dev/null || echo "app exec health FAILED (container down or not listening)"

echo
echo "=== host :8080 ==="
curl -sS -m 5 -i "http://127.0.0.1:${HTTP_PORT:-8080}/api/health" 2>&1 | head -30 || true

echo
echo "=== suggested recovery ==="
cat <<'EOF'
# 1) 앱 로그에서 migrate/FATAL 확인 후
docker compose up -d --build --force-recreate app
docker compose logs -f app

# 2) migrate만 수동 재시도 (app이 떠 있을 때)
docker compose exec app node /app/node_modules/prisma/build/index.js migrate deploy

# 3) nginx 재기동 (app healthy 후)
docker compose up -d nginx

# 4) 시드는 앱이 healthy 된 뒤에만
docker compose exec app node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts
EOF
