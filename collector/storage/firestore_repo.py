"""
collector/storage/firestore_repo.py — Firestore 데이터베이스 및 실시간 스냅샷 동기화
"""
from __future__ import annotations
import os
import json
import logging
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from collector.scraper.parsers.base import Snapshot, Table

load_dotenv()
logger = logging.getLogger("FirestoreRepo")
KST = ZoneInfo("Asia/Seoul")


class FirestoreRepo:
    def __init__(self, credentials_path: str | None = None):
        self.credentials_path = credentials_path or os.getenv("FIREBASE_CREDENTIALS_PATH")
        self.db = None
        self.local_dir = Path("out/firestore_data")
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._init_firebase()

    def _init_firebase(self):
        candidate_keys = [
            self.credentials_path,
            "firebase_key.json",
            "service_account.json",
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        ]

        for key_file in candidate_keys:
            if key_file and os.path.exists(key_file):
                try:
                    import firebase_admin
                    from firebase_admin import credentials, firestore

                    if not firebase_admin._apps:
                        cred = credentials.Certificate(key_file)
                        firebase_admin.initialize_app(cred)

                    self.db = firestore.client()
                    logger.info(f"✅ Firebase Firestore 연동 성공 ({key_file})")
                    return
                except Exception as e:
                    logger.warning(f"Firebase 초기화 실패 ({key_file}): {e}")

        logger.info("ℹ️ Firebase 키 미등록 -> 로컬 JSON DB 모드(out/firestore_data/)로 작동합니다.")

    def save_university_meta(self, univ_key: str, meta: dict[str, Any]):
        """대학 메타 정보 저장."""
        if self.db:
            try:
                self.db.collection("교대경쟁률").document(univ_key).set(meta, merge=True)
            except Exception as e:
                logger.error(f"Firestore 대학 메타 저장 실패: {e}")

        # 로컬 백업
        univ_file = self.local_dir / f"{univ_key}_meta.json"
        with open(univ_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2, default=str)

    def save_snapshot(
        self,
        univ_key: str,
        doc_id: str,
        snapshot: Snapshot,
        screenshot_meta: dict[str, str] | None = None,
        backdata_meta: dict[str, str] | None = None,
    ):
        tables_list = [
            {"title": t.title, "rows": t.rows}
            for t in snapshot.tables
        ]
        data = {
            "label": snapshot.label,
            "capturedAt": snapshot.captured_at,
            "status": snapshot.status,
            "errorMessage": snapshot.error_message,
            "notice": snapshot.notice,
            "summary": snapshot.summary,
            "screenshot": screenshot_meta or {},
            "backdata": backdata_meta or {},
            "tables": tables_list,
        }

        if self.db:
            try:
                fs_data = {
                    "label": snapshot.label,
                    "capturedAt": snapshot.captured_at,
                    "status": snapshot.status,
                    "errorMessage": snapshot.error_message,
                    "notice": snapshot.notice,
                    "summary": snapshot.summary,
                    "screenshot": screenshot_meta or {},
                    "backdata": backdata_meta or {},
                    "tablesJson": json.dumps(tables_list, ensure_ascii=False),
                }
                self.db.collection("교대경쟁률").document(univ_key).collection("snapshots").document(doc_id).set(fs_data)
                self.db.collection("교대경쟁률").document(univ_key).set({
                    "lastSnapshot": {
                        "label": snapshot.label,
                        "capturedAt": snapshot.captured_at,
                        "summary": snapshot.summary,
                        "status": snapshot.status,
                    }
                }, merge=True)
            except Exception as e:
                logger.error(f"Firestore 스냅샷 저장 실패 ({univ_key}/{doc_id}): {e}")

        # 로컬 백업
        snap_dir = self.local_dir / univ_key / "snapshots"
        snap_dir.mkdir(parents=True, exist_ok=True)
        with open(snap_dir / f"{doc_id}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def get_snapshots_for_univ(self, univ_key: str) -> list[Snapshot]:
        """특정 대학의 모든 스냅샷 조회 (시간순)."""
        snaps: list[Snapshot] = []

        if self.db:
            try:
                docs = self.db.collection("교대경쟁률").document(univ_key).collection("snapshots").order_by("capturedAt").stream()
                for doc in docs:
                    d = doc.to_dict()
                    tables = [Table(title=t.get("title"), rows=t.get("rows", [])) for t in d.get("tables", [])]
                    snaps.append(Snapshot(
                        label=d.get("label", ""),
                        captured_at=d.get("capturedAt", ""),
                        tables=tables,
                        status=d.get("status", "ok"),
                        error_message=d.get("errorMessage"),
                        notice=d.get("notice"),
                        summary=d.get("summary", {}),
                    ))
                if snaps:
                    return snaps
            except Exception as e:
                logger.warning(f"Firestore 스냅샷 조회 실패 ({univ_key}): {e}")

        # 로컬 조회 폴백
        snap_dir = self.local_dir / univ_key / "snapshots"
        if snap_dir.exists():
            files = sorted(snap_dir.glob("*.json"))
            for fpath in files:
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        d = json.load(f)
                        tables = [Table(title=t.get("title"), rows=t.get("rows", [])) for t in d.get("tables", [])]
                        snaps.append(Snapshot(
                            label=d.get("label", ""),
                            captured_at=d.get("capturedAt", ""),
                            tables=tables,
                            status=d.get("status", "ok"),
                            error_message=d.get("errorMessage"),
                            notice=d.get("notice"),
                            summary=d.get("summary", {}),
                        ))
                except Exception:
                    pass

        return snaps

    def save_run_log(self, run_id: str, log_data: dict[str, Any]):
        """수집 회차 전체 실행 로그 저장."""
        if self.db:
            try:
                self.db.collection("수집로그").document(run_id).set(log_data)
            except Exception as e:
                logger.error(f"Firestore 실행 로그 저장 실패: {e}")

        log_file = self.local_dir / "logs" / f"{run_id}.json"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2, default=str)
