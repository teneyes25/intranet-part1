#!/usr/bin/env bash
# Cloud Agent per-boot services (idempotent).
# Prefer Docker intranet stack on :8080 (host :3000 unused). Fall back to apt Postgres/Redis.
set -euo pipefail

HTTP_PORT="${HTTP_PORT:-8080}"

ensure_dockerd() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  sudo mkdir -p /etc/docker
  if [[ ! -f /etc/docker/daemon.json ]]; then
    sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{"storage-driver":"vfs","iptables":true,"ip-forward":true}
EOF
  fi
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo dockerd --host=unix:///var/run/docker.sock --config-file=/etc/docker/daemon.json \
      >/tmp/dockerd.log 2>&1 &
  fi
  for _ in $(seq 1 30); do
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_docker_intranet() {
  ensure_dockerd || return 1
  if [[ ! -f docker-compose.yml ]]; then
    return 1
  fi

  local files=(-f docker-compose.yml)
  # Nested Cloud Agent VMs often need host networking
  if [[ -f docker-compose.host.yml ]]; then
    files+=(-f docker-compose.host.yml)
  fi

  if [[ ! -f .env.production ]]; then
    HTTP_PORT="${HTTP_PORT}" INTRANET_COMPOSE_MODE=host bash scripts/intranet-server-up.sh
    return $?
  fi

  docker compose "${files[@]}" --env-file .env.production up -d
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
      echo "cloud-agent-start: docker intranet ready on :${HTTP_PORT}"
      return 0
    fi
    sleep 2
  done
  return 1
}

start_native_db() {
  if ! redis-cli ping >/dev/null 2>&1; then
    if command -v redis-server >/dev/null 2>&1; then
      sudo redis-server --daemonize yes --dir /var/lib/redis 2>/dev/null \
        || sudo redis-server --daemonize yes
    fi
  fi

  if ! pg_isready -q 2>/dev/null; then
    if command -v pg_ctlcluster >/dev/null 2>&1; then
      sudo pg_ctlcluster 16 main start || true
    fi
  fi

  if pg_isready -q 2>/dev/null; then
    PW="${POSTGRES_PASSWORD:-intranet_local_dev_pw}"
    USER_NAME="${POSTGRES_USER:-intranet}"
    DB_NAME="${POSTGRES_DB:-intranet}"
    if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${USER_NAME}'" | grep -q 1; then
      sudo -u postgres psql -c "CREATE USER ${USER_NAME} WITH PASSWORD '${PW}' CREATEDB;"
    fi
    if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
      sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${USER_NAME};"
    fi
    sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
    sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${USER_NAME};" >/dev/null
  fi

  if [[ ! -f .env ]]; then
    NEXTAUTH_SECRET="$(openssl rand -base64 32)"
    cat > .env <<EOF
POSTGRES_USER=intranet
POSTGRES_PASSWORD=intranet_local_dev_pw
POSTGRES_DB=intranet
POSTGRES_PORT=5432
DATABASE_URL=postgresql://intranet:intranet_local_dev_pw@localhost:5432/intranet?schema=public
REDIS_URL=redis://localhost:6379
REDIS_PORT=6379
NEXTAUTH_URL=http://localhost:${HTTP_PORT}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ALLOWED_ORIGINS=http://localhost:${HTTP_PORT},http://127.0.0.1:${HTTP_PORT}
ALLOWED_IP_PREFIXES=127.0.0.1,10.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,192.168.
LOG_LEVEL=info
NODE_ENV=development
EOF
    chmod 600 .env
  fi

  if [[ -f .env ]] && pg_isready -q 2>/dev/null; then
    npx prisma migrate deploy
    npx prisma db seed
  fi

  echo "cloud-agent-start: native postgres/redis ready (dev; app via npm run dev -- -p ${HTTP_PORT})"
}

# Docker stack first (matches office server on :8080)
if start_docker_intranet; then
  exit 0
fi

echo "[cloud-agent-start] docker intranet unavailable — falling back to native DB"
start_native_db
