#!/usr/bin/env bash
# 사무실 PC(192.168.0.16)에서 인트라넷 :8080 기동
# 사용: bash scripts/office-server-up.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export INTRANET_LAN_IP="${INTRANET_LAN_IP:-192.168.0.16}"
export HTTP_PORT="${HTTP_PORT:-8080}"

echo "[office-server] LAN IP=${INTRANET_LAN_IP} HTTP_PORT=${HTTP_PORT}"
echo "[office-server] 직원 접속 URL: http://${INTRANET_LAN_IP}:${HTTP_PORT}"
echo "[office-server] 일정: http://${INTRANET_LAN_IP}:${HTTP_PORT}/boards/schedule"

# Cloud Agent(172.30.x) 에서는 이 IP 가 없어 직원 PC에서 접속 불가
case "$(hostname -I 2>/dev/null || true)" in
  *192.168.0.16*)
    ;;
  *)
    cat <<EOF >&2

[경고] 이 머신에 ${INTRANET_LAN_IP} 인터페이스가 없습니다.
  → 반드시 IPv4 가 ${INTRANET_LAN_IP} 인 사무실 PC에서 이 스크립트를 실행하세요.

EOF
    ;;
esac

exec bash scripts/intranet-server-up.sh
