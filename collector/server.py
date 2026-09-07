"""
collector/server.py — 대시보드 연동용 FastAPI 백엔드 서버
"""
from __future__ import annotations
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from collector.config.universities import UNIVERSITIES, in_scope, by_key
from collector.config.schedule import generate_rounds, get_current_label
from collector.storage.firestore_repo import FirestoreRepo
from collector.storage.drive_repo import DriveRepo
from collector.main import run_collector

KST = ZoneInfo("Asia/Seoul")
app = FastAPI(title="2027 수시 교대 경쟁률 취합 API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

firestore_repo = FirestoreRepo()
drive_repo = DriveRepo()

# 수집 상태 관리
is_collecting = False
last_collect_status = {"status": "idle", "label": "", "time": "", "results": {}}


class CollectRequest(BaseModel):
    label: str | None = None
    univs: list[str] | None = None
    all_univs: bool = False
    report: bool = True
    final: bool = False


@app.get("/api/status")
def get_status():
    return {
        "isCollecting": is_collecting,
        "lastStatus": last_collect_status,
        "serverTime": datetime.now(KST).isoformat(),
        "defaultLabel": get_current_label(),
    }


@app.get("/api/universities")
def get_universities():
    univ_list = []
    for u in UNIVERSITIES:
        snaps = firestore_repo.get_snapshots_for_univ(u.key)
        latest_snap = snaps[-1] if snaps else None
        prev_snap = snaps[-2] if len(snaps) >= 2 else None

        latest_summary = latest_snap.summary if latest_snap else {"mojip": 0, "jiwon": 0, "ratio": "-"}
        prev_summary = prev_snap.summary if prev_snap else None

        # 경쟁률 증감 계산
        ratio_diff = None
        jiwon_diff = None
        if latest_summary.get("ratio") and prev_summary and prev_summary.get("ratio"):
            try:
                curr_r = float(latest_summary["ratio"].split(":")[0].strip())
                prev_r = float(prev_summary["ratio"].split(":")[0].strip())
                ratio_diff = round(curr_r - prev_r, 2)
            except Exception:
                pass
        if latest_summary.get("jiwon") is not None and prev_summary and prev_summary.get("jiwon") is not None:
            jiwon_diff = latest_summary["jiwon"] - prev_summary["jiwon"]

        # 최신 캡쳐 이미지 경로 확인
        capture_url = None
        if latest_snap:
            # 로컬 파일 확인
            img_dir = ROOT_DIR / "out" / "captures" / u.key
            if img_dir.exists():
                imgs = sorted(img_dir.glob("*.png"), key=os.path.getmtime)
                if imgs:
                    capture_url = f"/out/captures/{u.key}/{imgs[-1].name}"

        rounds = generate_rounds(u)

        univ_list.append({
            "key": u.key,
            "fullName": u.full_name,
            "region": u.region,
            "platform": u.platform,
            "ratioUrl": u.ratio_url,
            "acceptStart": u.accept_start.isoformat() if u.accept_start else None,
            "acceptEnd": u.accept_end.isoformat() if u.accept_end else None,
            "inScope": u.in_scope,
            "note": u.note,
            "publishUntil": u.publish_until.isoformat() if u.publish_until else None,
            "totalRounds": len(rounds),
            "snapshotCount": len(snaps),
            "latestSnapshot": {
                "label": latest_snap.label if latest_snap else None,
                "capturedAt": latest_snap.captured_at if latest_snap else None,
                "status": latest_snap.status if latest_snap else ("pre" if not u.ratio_url else "none"),
                "notice": latest_snap.notice if latest_snap else None,
                "mojip": latest_summary.get("mojip", 0),
                "jiwon": latest_summary.get("jiwon", 0),
                "ratio": latest_summary.get("ratio", "-"),
                "ratioDiff": ratio_diff,
                "jiwonDiff": jiwon_diff,
                "captureUrl": capture_url,
            }
        })
    return univ_list


@app.get("/api/snapshots/{univ_key}")
def get_university_snapshots(univ_key: str):
    try:
        u = by_key(univ_key)
    except StopIteration:
        raise HTTPException(status_code=404, detail="대학을 찾을 수 없습니다.")

    snaps = firestore_repo.get_snapshots_for_univ(univ_key)
    
    # 각 스냅샷에 첨부된 로컬 캡쳐 및 xlsx url 바인딩
    snap_data = []
    for s in snaps:
        # 시간 추출
        capture_url = None
        xlsx_url = None
        
        # 캡쳐 탐색
        img_dir = ROOT_DIR / "out" / "captures" / univ_key
        if img_dir.exists():
            for p in img_dir.glob("*.png"):
                capture_url = f"/out/captures/{univ_key}/{p.name}"

        # 엑셀 탐색
        xlsx_dir = ROOT_DIR / "out" / "backdata" / univ_key
        if xlsx_dir.exists():
            for p in xlsx_dir.glob("*.xlsx"):
                xlsx_url = f"/out/backdata/{univ_key}/{p.name}"

        snap_data.append({
            "label": s.label,
            "capturedAt": s.captured_at,
            "status": s.status,
            "notice": s.notice,
            "summary": s.summary,
            "captureUrl": capture_url,
            "xlsxUrl": xlsx_url,
            "tables": [
                {"title": t.title, "rows": t.rows}
                for t in s.tables
            ]
        })

    return {
        "university": {
            "key": u.key,
            "fullName": u.full_name,
            "platform": u.platform,
            "ratioUrl": u.ratio_url,
            "acceptStart": u.accept_start.isoformat() if u.accept_start else None,
            "acceptEnd": u.accept_end.isoformat() if u.accept_end else None,
            "rounds": [
                {"label": r.label, "scheduledAt": r.scheduled_at.isoformat(), "isFinal": r.is_final}
                for r in generate_rounds(u)
            ]
        },
        "snapshots": snap_data
    }


async def _bg_collect(req: CollectRequest):
    global is_collecting, last_collect_status
    is_collecting = True
    last_collect_status["status"] = "running"
    last_collect_status["label"] = req.label or get_current_label()
    last_collect_status["time"] = datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")

    try:
        await run_collector(
            label=req.label,
            univ_keys=req.univs,
            include_all=req.all_univs,
            generate_report=req.report,
            is_final=req.final,
        )
        last_collect_status["status"] = "completed"
    except Exception as e:
        last_collect_status["status"] = f"error: {e}"
    finally:
        is_collecting = False


@app.post("/api/collect")
async def trigger_collect(req: CollectRequest, background_tasks: BackgroundTasks):
    global is_collecting
    if is_collecting:
        return JSONResponse(status_code=409, content={"message": "이미 수집 작업이 진행 중입니다."})

    background_tasks.add_task(_bg_collect, req)
    return {
        "status": "started",
        "label": req.label or get_current_label(),
        "univs": req.univs or "in_scope",
        "message": "수집 작업이 백그라운드에서 시작되었습니다."
    }


@app.get("/api/reports")
def get_reports():
    reports = []
    report_dir = ROOT_DIR / "out" / "reports"
    if report_dir.exists():
        for p in sorted(report_dir.glob("*.xlsx"), key=os.path.getmtime, reverse=True):
            reports.append({
                "fileName": p.name,
                "sizeBytes": p.stat().st_size,
                "createdAt": datetime.fromtimestamp(p.stat().st_mtime, tz=KST).isoformat(),
                "downloadUrl": f"/out/reports/{p.name}",
            })
    return reports


@app.get("/api/logs")
def get_logs():
    logs = []
    log_dir = ROOT_DIR / "out" / "firestore_data" / "logs"
    if log_dir.exists():
        import json
        for p in sorted(log_dir.glob("*.json"), key=os.path.getmtime, reverse=True):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    logs.append(json.load(f))
            except Exception:
                pass
    return logs


# out 디렉토리 정적 서빙
out_dir = ROOT_DIR / "out"
out_dir.mkdir(parents=True, exist_ok=True)
app.mount("/out", StaticFiles(directory=str(out_dir)), name="out")

# 프론트엔드 빌드 서빙 (존재하는 경우)
web_dist = ROOT_DIR / "web" / "dist"
if web_dist.exists():
    app.mount("/", StaticFiles(directory=str(web_dist), html=True), name="web")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("collector.server:app", host="0.0.0.0", port=8000, reload=False)
