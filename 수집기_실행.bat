@echo off
chcp 65001 > nul
setlocal

:: 2027 수시 교대 경쟁률 자동 수집기 실행기
set APP_DIR=%~dp0
cd /d "%APP_DIR%"

echo ==========================================================
echo    2027 수시 교대 경쟁률 자동 수집기를 시작합니다...
echo ==========================================================

python gui_collector.py

endlocal
