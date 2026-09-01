@echo off
REM 사무실 PC: 최신 인트라넷(매종이 LLM·연차·일정 포함) + DB 시드 + Docker :8080 재배포
setlocal
cd /d "%~dp0\.."

if "%INTRANET_LAN_IP%"=="" set INTRANET_LAN_IP=192.168.0.16
if "%HTTP_PORT%"=="" set HTTP_PORT=8080
REM 매종이 LLM(/admin/ai-models) 이 포함된 브랜치
if "%INTRANET_GIT_BRANCH%"=="" set INTRANET_GIT_BRANCH=cursor/admin-user-board-mgmt-0c07

echo [office-sync] LAN=%INTRANET_LAN_IP% port=%HTTP_PORT%
echo [office-sync] git pull %INTRANET_GIT_BRANCH% ...
git fetch origin
git checkout %INTRANET_GIT_BRANCH%
if errorlevel 1 goto :fail
git pull origin %INTRANET_GIT_BRANCH%
if errorlevel 1 goto :fail

echo [office-sync] migrate + seed...
call npm run office:db-seed
if errorlevel 1 goto :fail

echo [office-sync] docker rebuild...
call npm run docker:sync
if errorlevel 1 goto :fail

echo.
echo [office-sync] 완료. 시크릿 창으로 접속하세요.
echo   http://%INTRANET_LAN_IP%:%HTTP_PORT%/
echo   매종이 LLM: http://%INTRANET_LAN_IP%:%HTTP_PORT%/admin/ai-models
echo   로그인: admin@intranet.local / admin1234!!
exit /b 0

:fail
echo [office-sync] 실패 — docker ps 와 .env.production POSTGRES_PASSWORD 를 확인하세요.
exit /b 1
