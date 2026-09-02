@echo off
REM 사무실 PC에서 사내 메신저 반영 여부만 확인 (배포는 하지 않음)
setlocal
cd /d "%~dp0\.."

echo ===== 현재 폴더 =====
cd
echo.
echo ===== git =====
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git log -1 --oneline
echo.
if exist "src\features\messenger\constants.ts" (
  echo [OK] 사내 메신저 소스 있음
) else (
  echo [누락] 사내 메신저 소스 없음 — 예전 브랜치입니다. scripts\office-sync.cmd 를 실행하세요.
)
echo.
echo ===== Docker =====
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo ===== DB 메신저 테이블 =====
docker exec intranet-db psql -U intranet -d intranet -tAc "SELECT to_regclass('public.messenger_profiles')" 2>nul
echo.
echo ===== 로컬 :8080 /messenger =====
curl -sI -o - http://127.0.0.1:8080/messenger 2>nul | findstr /I "HTTP Location"
echo.
echo 직원이 볼 주소: http://192.168.0.16:8080   ^(:3000 아님, 시크릿 창^)
echo 기대 브랜치: cursor/admin-user-board-mgmt-0c07
echo 기대 기능: 사이드바 도구-사내 메신저, 홈 팝업, /messenger
exit /b 0
