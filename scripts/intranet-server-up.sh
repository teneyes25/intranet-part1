#!/usr/bin/env bash
# 이 PC를 인트라넷 서버로 기동 (Docker Compose · 기본 HTTP 8080 · 호스트 3000 미사용)
set -euo pipefail

cd "$(dirname "$0")/.."

HTTP_PORT="${HTTP_PORT:-8080}"
ENV_FILE=".env.production"

detect_lan_ip() {
  # 사설망 IP 우선 (192.168/10/172.16-31), 없으면 hostname -I 첫 주소
  local ip
  ip="$(hostname -I 2>/dev/null | tr ' ' '\n' | while read -r cand; do
    case "$cand" in
      127.*|::*) ;;
      192.168.*|10.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) echo "$cand"; break ;;
    esac
  done)"
  if [[ -z "${ip}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  echo "${ip:-127.0.0.1}"
}

DOCKER=(docker)

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    DOCKER=(docker)
    return 0
  fi
  echo "[intranet-server] starting dockerd..."
  sudo mkdir -p /var/run
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
  fi
  for _ in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then
      DOCKER=(sudo docker)
      return 0
    fi
    sleep 1
  done
  echo "[intranet-server] docker daemon failed to start; see /tmp/dockerd.log" >&2
  exit 1
}

write_env_if_missing() {
  local lan_ip="$1"
  local base="http://${lan_ip}:${HTTP_PORT}"
  if [[ -f "${ENV_FILE}" ]]; then
    echo "[intranet-server] using existing ${ENV_FILE}"
    return 0
  fi

  local secret
  secret="$(openssl rand -base64 32)"
  local pw
  pw="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"

  cat > "${ENV_FILE}" <<EOF
POSTGRES_USER=intranet
POSTGRES_PASSWORD=${pw}
POSTGRES_DB=intranet
POSTGRES_PORT=5432

REDIS_PORT=6379
REDIS_URL=redis://redis:6379

# 다른 PC는 이 URL로 접속 (IP가 바뀌면 NEXTAUTH_URL·ALLOWED_ORIGINS 함께 수정)
NEXTAUTH_URL=${base}
NEXTAUTH_SECRET=${secret}

HTTP_PORT=${HTTP_PORT}
# 호스트 3000 충돌 회피 — App 직접 노출 시에만 사용
APP_PORT=3001

PRISMA_MIGRATE_DEPLOY=true
PRISMA_ACCEPT_DATA_LOSS=false
RUN_SEED=true
PILOT_MODE=false
RUN_DEMO_SEED=false
RUN_DEALER_DEMO_SEED=false
BEHIND_NGINX=true

NODE_ENV=production
LOG_LEVEL=info

ALLOWED_ORIGINS=${base},http://localhost:${HTTP_PORT},http://127.0.0.1:${HTTP_PORT}
ALLOWED_IP_PREFIXES=127.0.0.1,10.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,192.168.
EOF
  chmod 600 "${ENV_FILE}"
  echo "[intranet-server] wrote ${ENV_FILE} (NEXTAUTH_URL=${base})"
}

ensure_docker
LAN_IP="$(detect_lan_ip)"
write_env_if_missing "${LAN_IP}"

COMPOSER=("${DOCKER[@]}" compose --env-file "${ENV_FILE}")
# Docker bridge가 막힌 환경(중첩 컨테이너 등)에서는 host 네트워크 폴백
COMPOSE_FILES=(-f docker-compose.yml)
MODE="${INTRANET_COMPOSE_MODE:-auto}" # auto | bridge | host

start_stack() {
  local mode="$1"
  if [[ "${mode}" == "host" ]]; then
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.host.yml)
    echo "[intranet-server] using host-network compose (app :3001, nginx :${HTTP_PORT})"
  else
    COMPOSE_FILES=(-f docker-compose.yml)
    echo "[intranet-server] using bridge compose (nginx :${HTTP_PORT})"
  fi
  "${DOCKER[@]}" compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" down --remove-orphans >/dev/null 2>&1 || true
  "${DOCKER[@]}" compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" up -d --build
}

wait_health() {
  local ok=0
  for _ in $(seq 1 90); do
    if curl -sf "http://127.0.0.1:${HTTP_PORT}/api/health" >/tmp/intranet-health.json 2>/dev/null; then
      ok=1
      break
    fi
    sleep 2
  done
  return $((1 - ok))
}

echo "[intranet-server] building & starting (HTTP :${HTTP_PORT}, LAN ${LAN_IP})..."
if [[ "${MODE}" == "host" ]]; then
  start_stack host
elif [[ "${MODE}" == "bridge" ]]; then
  start_stack bridge
else
  start_stack bridge
  if ! wait_health; then
    echo "[intranet-server] bridge mode unhealthy — falling back to host network"
    start_stack host
  fi
fi

echo "[intranet-server] waiting for health..."
if ! wait_health; then
  echo "[intranet-server] health check failed" >&2
  "${DOCKER[@]}" compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" ps >&2 || true
  "${DOCKER[@]}" compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" logs --tail=80 app nginx >&2 || true
  exit 1
fi

# 최초 시드 후 RUN_SEED=false 로 고정 (재기동 시 중복 시드 방지)
if grep -q '^RUN_SEED=true' "${ENV_FILE}"; then
  sed -i 's/^RUN_SEED=true/RUN_SEED=false/' "${ENV_FILE}"
  echo "[intranet-server] RUN_SEED set to false after first boot"
fi

BASE_URL="$(grep '^NEXTAUTH_URL=' "${ENV_FILE}" | cut -d= -f2-)"
echo ""
echo "=========================================="
echo " Intranet server ready"
echo " Local:    http://127.0.0.1:${HTTP_PORT}"
echo " LAN:      ${BASE_URL}"
echo " Login:    /login   (admin@intranet.local / password1234)"
echo " Signup:   /signup  (관리자 승인 후 로그인)"
echo "=========================================="
cat /tmp/intranet-health.json
echo ""
