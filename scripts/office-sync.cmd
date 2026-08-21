@echo off
REM 사무실 PC: 일정 게시판 코드 + DB 시드 + Docker :8080 재배포
setlocal
cd /d "%~dp0\.."

if "%INTRANET_LAN_IP%"=="" set INTRANET_LAN_IP=192.168.0.16
if "%HTTP_PORT%"=="" set HTTP_PORT=8080

echo [office-sync] LAN=%INTRANET_LAN_IP% port=%HTTP_PORT%
echo [office-sync] git pull schedule branch...
git fetch origin
git checkout cursor/schedule-calendar-board-0c07
git pull origin cursor/schedule-calendar-board-0c07

echo [office-sync] migrate + seed...
call npm run office:db-seed
if errorlevel 1 goto :fail

echo [office-sync] docker rebuild (일정 메뉴는 여기에 포함됨)...
call npm run docker:sync
if errorlevel 1 goto :fail

echo.
echo [office-sync] 완료. 시크릿 창으로 접속하세요.
echo   http://%INTRANET_LAN_IP%:%HTTP_PORT%/
echo   http://%INTRANET_LAN_IP%:%HTTP_PORT%/boards/schedule
echo   로그인: admin@intranet.local / password1234
exit /b 0

:fail
echo [office-sync] 실패 — docker ps 와 .env.production POSTGRES_PASSWORD 를 확인하세요.
exit /b 1
