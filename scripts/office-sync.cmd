@echo off
REM 사무실 PC: 사내 메신저 포함 최신 브랜치를 origin 과 동일하게 맞춘 뒤 Docker :8080 재배포
setlocal
cd /d "%~dp0\.."

if "%INTRANET_LAN_IP%"=="" set INTRANET_LAN_IP=192.168.0.16
if "%HTTP_PORT%"=="" set HTTP_PORT=8080
if "%INTRANET_GIT_BRANCH%"=="" set INTRANET_GIT_BRANCH=cursor/admin-user-board-mgmt-0c07

echo [office-sync] LAN=%INTRANET_LAN_IP% port=%HTTP_PORT%
echo [office-sync] 원격 브랜치로 강제 동기화: %INTRANET_GIT_BRANCH%
git fetch origin %INTRANET_GIT_BRANCH%
if errorlevel 1 goto :fail
git checkout -B %INTRANET_GIT_BRANCH% origin/%INTRANET_GIT_BRANCH%
if errorlevel 1 goto :fail
git reset --hard origin/%INTRANET_GIT_BRANCH%
if errorlevel 1 goto :fail

for /f %%i in ('git rev-parse --short HEAD') do set HEADSHA=%%i
echo [office-sync] HEAD=%HEADSHA%  branch=%INTRANET_GIT_BRANCH%
if not exist "src\features\messenger\constants.ts" (
  echo [office-sync] 실패 — 사내 메신저 코드가 없습니다. git fetch 를 확인하세요.
  goto :fail
)

echo [office-sync] migrate + seed...
call npm run office:db-seed
if errorlevel 1 goto :fail

echo [office-sync] docker rebuild...
call npm run docker:sync
if errorlevel 1 goto :fail

echo [office-sync] 반영 확인...
call powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 8 -MaximumRedirection 0 -Uri 'http://127.0.0.1:%HTTP_PORT%/messenger' } catch { if ($_.Exception.Response) { $r = $_.Exception.Response } }; if ($r) { Write-Host ('[office-sync] /messenger HTTP ' + [int]$r.StatusCode) } }"
docker exec intranet-db psql -U intranet -d intranet -tAc "SELECT to_regclass('public.messenger_profiles')" 2>nul | findstr messenger_profiles >nul
if errorlevel 1 (
  echo [office-sync] 경고 — DB에 messenger_profiles 테이블이 없습니다. migrate 로그를 확인하세요.
) else (
  echo [office-sync] DB messenger_profiles OK
)

echo.
echo [office-sync] 완료. 반드시 아래 주소로 시크릿 창에서 여세요. (:3000 아님)
echo   http://%INTRANET_LAN_IP%:%HTTP_PORT%/
echo   사내 메신저: http://%INTRANET_LAN_IP%:%HTTP_PORT%/messenger
echo   로그인: admin@intranet.local / admin1234!!
echo   메종이 LLM: scripts\office-ollama.cmd  (Ollama 설치 후 1회)
echo   기대 커밋: %HEADSHA%  (GitHub PR #5 최신과 같아야 함)
exit /b 0

:fail
echo [office-sync] 실패 — 아래를 확인하세요.
echo   1^) 이 창이 intranet-part1 폴더에서 실행됐는지
echo   2^) git fetch 가 되는지 (GitHub 로그인)
echo   3^) docker ps 에 intranet-db / intranet-app 이 있는지
echo   4^) .env.production 의 POSTGRES_PASSWORD
exit /b 1
