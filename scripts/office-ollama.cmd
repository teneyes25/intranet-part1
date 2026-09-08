@echo off
REM 사무실 PC: 메종이 LLM(Ollama) 기동 + llama3.2 모델 준비
setlocal
cd /d "%~dp0\.."

where ollama >nul 2>&1
if errorlevel 1 (
  echo [office-ollama] Ollama 가 설치되어 있지 않습니다.
  echo   https://ollama.com/download 에서 Windows 용을 설치한 뒤
  echo   이 스크립트를 다시 실행하세요.
  exit /b 1
)

echo [office-ollama] ollama serve 시작...
start "intranet-ollama" /min cmd /c ollama serve
timeout /t 3 /nobreak >nul

echo [office-ollama] 모델 확인/다운로드: llama3.2
ollama pull llama3.2
if errorlevel 1 goto :fail

echo [office-ollama] 준비 완료. Docker 인트라넷은 host.docker.internal:11434 로 접속합니다.
echo   인트라넷을 켠 뒤 메종이에게 인사하면 모델이 워밍업됩니다.
exit /b 0

:fail
echo [office-ollama] 실패 — ollama serve / pull 로그를 확인하세요.
exit /b 1
