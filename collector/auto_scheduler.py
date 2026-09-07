"""
collector/auto_scheduler.py — 2027 수시 교대 경쟁률 매일 20:10 정기 자동 수집 스케줄러
"""
import os
import sys
import time
import argparse
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from collector.main import run_collector

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

KST = ZoneInfo("Asia/Seoul")


def register_windows_task():
    python_exe = sys.executable
    script_path = str(ROOT_DIR / "collector" / "auto_scheduler.py")
    cmd = f'schtasks /create /tn "GyodaeRatioDailyCollector" /tr "\\"{python_exe}\\" \\"{script_path}\\" --now" /sc daily /st 20:10 /f'
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if res.returncode == 0:
            print("✅ [Windows Task Scheduler] 매일 저녁 20:10 수집 작업 등록 완료!")
        else:
            print(f"작업 스케줄러 등록 출력: {res.stdout} {res.stderr}")
    except Exception as e:
        print(f"작업 스케줄러 등록 실패: {e}")


def run_loop():
    print("🕒 [Auto Scheduler] 20:10 KST 정기 자동 수집 대기 중...")
    while True:
        now = datetime.now(KST)
        if now.hour == 20 and now.minute == 10:
            print(f"🚀 [20:10 KST 감지] 정기 자동 수집 시작: {now.strftime('%Y-%m-%d %H:%M:%S')}")
            asyncio.run(run_collector(is_auto=True))
            print("대기 모드로 복귀 (70초 휴식)...")
            time.sleep(70)
        time.sleep(15)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Gyodae Ratio Daily Auto Scheduler")
    parser.add_argument("--now", action="store_true", help="즉시 1회 자동 수집 실행")
    parser.add_argument("--register-task", action="store_true", help="Windows 작업 스케줄러 등록")
    args = parser.parse_args()

    if args.register_task:
        register_windows_task()
    elif args.now:
        print("🚀 [즉시 실행] 정기 자동 수집 모드로 1회 실행합니다.")
        asyncio.run(run_collector(is_auto=True))
    else:
        register_windows_task()
        run_loop()