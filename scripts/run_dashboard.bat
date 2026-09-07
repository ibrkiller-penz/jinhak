@echo off
chcp 65001 > nul
setlocal

:: gyodae-ratio 웹 대시보드 서버 실행 스크립트
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

echo ========================================================
echo   2027 수시 교대 경쟁률 자동화 대시보드 서버 시작
echo   접속 주소: http://localhost:8000
echo ========================================================

start http://localhost:8000
python -m uvicorn collector.server:app --host 0.0.0.0 --port 8000

endlocal
