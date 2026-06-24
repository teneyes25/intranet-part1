#!/bin/sh
# uploads 볼륨 백업 (Docker volume → tar.gz)
# 사용: ./scripts/backup/uploads-backup.sh [출력디렉터리]

set -e

BACKUP_DIR="${1:-./backups/uploads}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VOLUME="${UPLOADS_VOLUME:-intranet-uploads-data}"

mkdir -p "$BACKUP_DIR"

echo "[backup] uploads volume 백업: $VOLUME"

docker run --rm \
  -v "${VOLUME}:/data:ro" \
  -v "$(cd "$BACKUP_DIR" && pwd):/backup" \
  alpine tar czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data .

find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +30 -delete 2>/dev/null || true

echo "[backup] 완료: $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
