#!/bin/sh
# PostgreSQL 백업 스크립트 (cron 또는 수동 실행)
# 사용: ./scripts/backup/postgres-backup.sh [출력디렉터리]

set -e

BACKUP_DIR="${1:-./backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER="${POSTGRES_CONTAINER:-intranet-db}"

POSTGRES_USER="${POSTGRES_USER:-intranet}"
POSTGRES_DB="${POSTGRES_DB:-intranet}"

mkdir -p "$BACKUP_DIR"

echo "[backup] PostgreSQL dump 시작: $TIMESTAMP"

docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$BACKUP_DIR/intranet_${TIMESTAMP}.dump"

# 30일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "intranet_*.dump" -mtime +30 -delete 2>/dev/null || true

echo "[backup] 완료: $BACKUP_DIR/intranet_${TIMESTAMP}.dump"
