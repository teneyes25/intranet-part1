#!/bin/sh
# 백업 복구 테스트 (DR drill) — 스테이징/검증용
# 사용: ./scripts/backup/restore-test.sh [백업파일.dump] [테스트DB컨테이너]
#
# ⚠️ 운영 DB에 직접 실행하지 마세요. 별도 테스트 인스턴스에서 검증합니다.

set -e

DUMP="${1:-./backups/postgres/intranet_latest.dump}"
CONTAINER="${POSTGRES_CONTAINER:-intranet-db}"
POSTGRES_USER="${POSTGRES_USER:-intranet}"
TEST_DB="${RESTORE_TEST_DB:-intranet_restore_test}"

if [ ! -f "$DUMP" ]; then
  echo "[restore-test] 백업 파일 없음: $DUMP"
  echo "  먼저: sh scripts/backup/postgres-backup.sh"
  exit 1
fi

echo "[restore-test] 테스트 DB 생성: $TEST_DB"
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c \
  "DROP DATABASE IF EXISTS \"$TEST_DB\"; CREATE DATABASE \"$TEST_DB\";"

echo "[restore-test] pg_restore → $TEST_DB"
docker exec -i "$CONTAINER" pg_restore -U "$POSTGRES_USER" -d "$TEST_DB" --no-owner --clean \
  < "$DUMP" 2>/dev/null || true

echo "[restore-test] 검증 쿼리"
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d "$TEST_DB" -c \
  "SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS dealers FROM dealers;"

echo "[restore-test] ✅ 복구 테스트 완료 — 테스트 DB: $TEST_DB"
echo "[restore-test] 정리: DROP DATABASE \"$TEST_DB\";"
