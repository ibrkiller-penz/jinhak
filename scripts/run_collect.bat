@echo off
chcp 65001 > nul
setlocal

:: gyodae-ratio 자동 수집 실행 배치 파일
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%.."

echo [Gyodae-Ratio] 2027 수시 교대 경쟁률 자동 수집을 시작합니다...
python collector\main.py %*

if %ERRORLEVEL% equ 0 (
    echo [Gyodae-Ratio] 수집 작업이 성공적으로 완료되었습니다.
) else (
    echo [Gyodae-Ratio] 수집 중 오류가 발생했습니다. (ExitCode: %ERRORLEVEL%)
)

endlocal
