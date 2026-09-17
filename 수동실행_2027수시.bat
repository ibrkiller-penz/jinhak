@echo off
chcp 65001 > nul
title 2027 수시모집 전국 대학 경쟁률 수동 크롤러 & 드라이브 자동 전송
cls
echo ======================================================================
echo  [2027 수시모집] 전국 246개 대학 경쟁률 수동 수집기
echo ======================================================================
echo.
echo  1. 전국 전체 대학 (246개교) 실시간 수집 및 마스터 엑셀 생성
echo  2. 교대 / 사범대 (11개교) 수동 수집
echo  3. 일반 4년제 대학 (178개교) 수동 수집
echo  4. 과기원 / 특수대 (6개교) 수동 수집
echo  5. 전문대학 (51개교) 수동 수집
echo.
set /p opt="수행할 작업 번호를 입력하세요 (기본값: 1): "
if "%opt%"=="" set opt=1

cd /d "C:\Users\pc\Desktop\안티그래비티 결과\gyodae-ratio"

if "%opt%"=="1" python collector\run_manual_collector.py --category all
if "%opt%"=="2" python collector\run_manual_collector.py --category 교대
if "%opt%"=="3" python collector\run_manual_collector.py --category 4년제
if "%opt%"=="4" python collector\run_manual_collector.py --category 과기원
if "%opt%"=="5" python collector\run_manual_collector.py --category 전문대

echo.
echo ======================================================================
echo 작업이 완료되었습니다. 아무 키나 누르면 창이 닫힙니다.
echo ======================================================================
pause > nul
