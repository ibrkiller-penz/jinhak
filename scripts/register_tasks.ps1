<#
.SYNOPSIS
    Windows 작업 스케줄러에 2027 수시 교대 경쟁률 수집 작업(7회차) 등록 스크립트
.DESCRIPTION
    9/7(월) ~ 9/10(목) 매일 저녁 20:00 (4회)
    9/11(금) 마감일 10:00, 15:00 (+취합 보고서 생성) (2회)
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BatPath = Join-Path $ScriptDir "run_collect.bat"

Write-Host "=== 2027 수시 교대 경쟁률 작업 스케줄러 등록 ===" -ForegroundColor Cyan
Write-Host "실행 스크립트: $BatPath" -ForegroundColor Yellow

# 1. 매일 20:00 작업 (9/7 ~ 9/10)
$dailyDates = @("2026/09/07", "2026/09/08", "2026/09/09", "2026/09/10")
foreach ($d in $dailyDates) {
    $dateTag = $d.Replace("/", "")
    $taskName = "교대경쟁률_${dateTag}_2000"
    $action = "cmd.exe /c `"$BatPath`""
    
    Write-Host "등록 중: $taskName ($d 20:00)..." -NoNewline
    schtasks /Create /TN $taskName /SC ONCE /SD $d /ST 20:00 /TR $action /F | Out-Null
    Write-Host " [완료]" -ForegroundColor Green
}

# 2. 마감일 9/11(금) 10:00 작업
$taskName10 = "교대경쟁률_20260911_1000"
$action10 = "cmd.exe /c `"$BatPath --label 09월11일10시`""
Write-Host "등록 중: $taskName10 (2026/09/11 10:00)..." -NoNewline
schtasks /Create /TN $taskName10 /SC ONCE /SD 2026/09/11 /ST 10:00 /TR $action10 /F | Out-Null
Write-Host " [완료]" -ForegroundColor Green

# 3. 마감일 9/11(금) 15:00 작업 (취합 보고서 자동 생성 포함)
$taskName15 = "교대경쟁률_20260911_1500"
$action15 = "cmd.exe /c `"$BatPath --label 09월11일15시 --report`""
Write-Host "등록 중: $taskName15 (2026/09/11 15:00 + 보고서)..." -NoNewline
schtasks /Create /TN $taskName15 /SC ONCE /SD 2026/09/11 /ST 15:00 /TR $action15 /F | Out-Null
Write-Host " [완료]" -ForegroundColor Green

Write-Host "`n모든 작업 스케줄러 등록이 완료되었습니다!" -ForegroundColor Cyan
Write-Host "※ 최종 회차는 대학별 마감 직후 대시보드 또는 'python collector\main.py --label 최종 --final --report' 로 수동 실행합니다." -ForegroundColor Yellow
