"""
collector/storage/drive_repo.py — Google Drive 저장소 및 스냅샷/엑셀 백데이터 자동 업로드 연동
"""
from __future__ import annotations
import os
import json
import base64
import logging
from pathlib import Path
from typing import Any
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("DriveRepo")

DEFAULT_GAS_WEBHOOK = os.getenv(
    "GAS_WEBHOOK_URL",
    "https://script.google.com/macros/s/AKfycbwo_6L7Fkjg_iv7LgsI9BB6EYY2Gz0yK0B7dnG9DxfP5yECtA1pboX3mud77YQG9BaHbg/exec"
)
DEFAULT_ROOT_FOLDER_ID = os.getenv("GDRIVE_ROOT_FOLDER_ID", "1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j")


class DriveRepo:
    def __init__(
        self,
        root_folder_id: str | None = None,
        credentials_path: str | None = None,
        webhook_url: str | None = None,
    ):
        self.root_folder_id = root_folder_id or DEFAULT_ROOT_FOLDER_ID
        self.credentials_path = credentials_path or os.getenv("GDRIVE_CREDENTIALS_PATH")
        self.webhook_url = webhook_url or DEFAULT_GAS_WEBHOOK
        self.service = None
        self.folder_cache: dict[str, str] = {}
        self.local_fallback_dir = Path("out/drive")
        self.local_fallback_dir.mkdir(parents=True, exist_ok=True)
        self._init_service()

    def _init_service(self):
        """서비스 계정 또는 OAuth 클라이언트를 통한 Google Drive API v3 초기화 (설정된 경우)."""
        candidate_sa_files = [
            self.credentials_path,
            "service_account.json",
            "gdrive_key.json",
            "firebase_key.json",
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        ]

        for sa_path in candidate_sa_files:
            if sa_path and os.path.exists(sa_path):
                try:
                    with open(sa_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if data.get("type") == "service_account":
                        from google.oauth2 import service_account
                        from googleapiclient.discovery import build
                        scopes = ["https://www.googleapis.com/auth/drive"]
                        creds = service_account.Credentials.from_service_account_file(sa_path, scopes=scopes)
                        self.service = build("drive", "v3", credentials=creds)
                        logger.info(f"✅ Google Drive 서비스 계정({data.get('client_email')}) 연동 성공")
                        return
                except Exception as e:
                    logger.warning(f"서비스 계정 초기화 실패 ({sa_path}): {e}")

        # OAuth 클라이언트 (token.json)
        if os.path.exists("token.json"):
            try:
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]
                creds = Credentials.from_authorized_user_file("token.json", SCOPES)
                if creds and creds.valid:
                    self.service = build("drive", "v3", credentials=creds)
                    logger.info("✅ Google Drive OAuth 사용자 연동 성공")
                    return
            except Exception as e:
                logger.warning(f"Google Drive OAuth 연동 실패: {e}")

        if self.webhook_url:
            logger.info(f"🌐 Google Apps Script 웹훅 모드로 연동됩니다: {self.webhook_url[:50]}...")
        else:
            logger.info("ℹ️ 로컬 백업 모드(out/drive/)로 저장됩니다.")

    def upload_via_webhook(self, local_path: Path, sub_folder: str) -> dict[str, str]:
        """Google Apps Script Webhook을 통해 지정된 대학 서브폴더에 파일 업로드."""
        file_name = local_path.name
        mime_type = "image/png" if file_name.endswith(".png") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        with open(local_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "action": "upload",
            "fileName": file_name,
            "mimeType": mime_type,
            "base64Data": b64_data,
            "subFolder": sub_folder,
            "rootFolderId": self.root_folder_id,
        }

        resp = requests.post(self.webhook_url, json=payload, timeout=45)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                file_id = data.get("fileId", "")
                file_url = data.get("fileUrl") or (f"https://drive.google.com/file/d/{file_id}/view?usp=drivesdk" if file_id else "")
                logger.info(f"🚀 [GAS Webhook] Drive 업로드 성공: {sub_folder}/{file_name} -> {file_url}")
                return {
                    "fileName": file_name,
                    "localPath": str(local_path.resolve()),
                    "fileId": file_id,
                    "webViewLink": file_url,
                    "folderUrl": data.get("folderUrl", ""),
                }
            else:
                raise RuntimeError(f"GAS Webhook 반환 에러: {data.get('error') or data.get('message')}")
        else:
            raise RuntimeError(f"GAS Webhook HTTP {resp.status_code}: {resp.text}")

    def upload_file(self, local_path: Path, folder_name: str) -> dict[str, str]:
        """
        파일을 Google Drive 대학 폴더(GAS Webhook 또는 Drive API)에 업로드.
        반환: {"fileId": ..., "webViewLink": ..., "fileName": ..., "localPath": ...}
        """
        file_name = local_path.name
        result = {
            "fileName": file_name,
            "localPath": str(local_path.resolve()),
            "fileId": "",
            "webViewLink": "",
            "folderUrl": "",
        }

        # 1. 로컬 백업 복사
        target_local = self.local_fallback_dir / folder_name / file_name
        target_local.parent.mkdir(parents=True, exist_ok=True)
        if target_local.resolve() != local_path.resolve():
            import shutil
            shutil.copy2(local_path, target_local)
        result["localPath"] = str(target_local.resolve())

        # 2. GAS Webhook 시도
        if self.webhook_url:
            try:
                res = self.upload_via_webhook(local_path, folder_name)
                return res
            except Exception as e:
                logger.warning(f"⚠️ GAS Webhook 업로드 실패 ({file_name}): {e}")

        # 3. Google Drive API v3 시도 (서비스 계정/OAuth)
        if self.service:
            try:
                from googleapiclient.http import MediaFileUpload
                mime_type = "image/png" if file_name.endswith(".png") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                file_metadata = {"name": file_name}
                
                # 폴더 조회/생성
                folder_id = self.get_or_create_folder(folder_name)
                if folder_id:
                    file_metadata["parents"] = [folder_id]

                media = MediaFileUpload(str(local_path), mimetype=mime_type, resumable=True)
                uploaded = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields="id, webViewLink",
                ).execute()

                result["fileId"] = uploaded.get("id", "")
                result["webViewLink"] = uploaded.get("webViewLink", "")
                logger.info(f"🚀 [Drive API] 업로드 성공: {folder_name}/{file_name} -> {result['webViewLink']}")
                return result
            except Exception as e:
                logger.warning(f"Drive API 업로드 실패 ({file_name}): {e}")

        # 4. 실패 시 로컬 파일 링크 fallback
        result["webViewLink"] = f"file:///{target_local.resolve()}".replace("\\", "/")
        return result

    def get_or_create_folder(self, folder_name: str, parent_id: str | None = None) -> str | None:
        """Drive API v3 폴더 조회 및 생성."""
        if not self.service:
            return None
        parent = parent_id or self.root_folder_id
        cache_key = f"{parent}_{folder_name}"
        if cache_key in self.folder_cache:
            return self.folder_cache[cache_key]

        try:
            q = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            if parent:
                q += f" and '{parent}' in parents"

            response = self.service.files().list(q=q, spaces="drive", fields="files(id, name)").execute()
            files = response.get("files", [])
            if files:
                folder_id = files[0]["id"]
            else:
                meta = {
                    "name": folder_name,
                    "mimeType": "application/vnd.google-apps.folder",
                }
                if parent:
                    meta["parents"] = [parent]
                folder = self.service.files().create(body=meta, fields="id").execute()
                folder_id = folder.get("id")

            self.folder_cache[cache_key] = folder_id
            return folder_id
        except Exception as e:
            logger.error(f"Drive 폴더 생성 실패 ({folder_name}): {e}")
            return None
