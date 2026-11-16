#!/usr/bin/env bash
# Cloud Agent per-boot services (idempotent).
set -euo pipefail

# Redis
if ! redis-cli ping >/dev/null 2>&1; then
  if command -v redis-server >/dev/null 2>&1; then
    sudo redis-server --daemonize yes --dir /var/lib/redis 2>/dev/null \
      || sudo redis-server --daemonize yes
  fi
fi

# PostgreSQL 16
if ! pg_isready -q 2>/dev/null; then
  if command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster 16 main start || true
  fi
fi

# Ensure app role/db exist (safe if already created)
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

# Local .env for agents (never overwrite an existing file)
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
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
ALLOWED_IP_PREFIXES=127.0.0.1,10.,172.16.,172.17.,192.168.
LOG_LEVEL=info
NODE_ENV=development
EOF
  chmod 600 .env
fi

# Apply migrations when DB is empty / behind (idempotent)
if [[ -f .env ]] && pg_isready -q 2>/dev/null; then
  npx prisma migrate deploy
  # Seed accounts/boards (script uses upserts — safe to re-run)
  npx prisma db seed
fi

echo "cloud-agent-start: postgres/redis ready"
