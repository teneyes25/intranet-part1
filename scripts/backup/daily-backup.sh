#!/bin/sh
# 매일 DB + uploads 통합 백업 (cron 등록용)
# 0 2 * * * /path/to/intranet-part1/scripts/backup/daily-backup.sh >> /var/log/intranet-backup.log 2>&1

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[daily-backup] 시작 $TIMESTAMP"

sh "$ROOT/scripts/backup/postgres-backup.sh" "$BACKUP_ROOT/postgres"
sh "$ROOT/scripts/backup/uploads-backup.sh" "$BACKUP_ROOT/uploads"

echo "[daily-backup] 완료 $TIMESTAMP"
