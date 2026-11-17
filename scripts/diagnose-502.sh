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
echo
echo "=== credential check (password values redacted) ==="
docker compose exec -T app sh -c 'echo "POSTGRES_USER=$POSTGRES_USER"; echo "POSTGRES_DB=$POSTGRES_DB"; echo "DATABASE_URL_HOST=$(echo "$DATABASE_URL" | sed -E "s#://([^:]+):[^@]+@#://\1:***@#")"' \
  2>/dev/null || echo "app env unavailable"
docker compose exec -T db sh -c 'echo "POSTGRES_USER=$POSTGRES_USER"; echo "POSTGRES_DB=$POSTGRES_DB"; echo "POSTGRES_PASSWORD_SET=$([ -n "$POSTGRES_PASSWORD" ] && echo yes || echo no)"' \
  2>/dev/null || echo "db env unavailable"

echo
echo "=== suggested recovery ==="
cat <<'EOF'
# Authentication failed / 502 이면 비밀번호 불일치가 1순위입니다.

# A) .env.production 의 POSTGRES_PASSWORD 로 DB 사용자 맞추기 (데이터 유지)
docker compose exec db psql -U intranet -d intranet -c "ALTER USER intranet WITH PASSWORD 'YOUR_PASSWORD_FROM_ENV_PRODUCTION';"
cp -f .env.production .env
docker compose --env-file .env.production up -d --force-recreate app
docker compose --env-file .env.production up -d nginx

# B) 앱 로그에서 migrate/FATAL 확인 후 재빌드
docker compose --env-file .env.production up -d --build --force-recreate app
docker compose logs -f app

# C) 시드는 앱이 healthy 된 뒤에만
docker compose exec app node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts
EOF
