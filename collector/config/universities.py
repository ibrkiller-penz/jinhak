"""
config/universities.py — 2027 수시 교대 경쟁률 수집 대상 대학 목록 및 URL 설정
"""
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


def kst(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M").replace(tzinfo=KST)


@dataclass(frozen=True)
class University:
    key: str                 # 약칭 = Firestore 문서 ID, Drive 폴더명, 시트명
    full_name: str
    region: str
    platform: str            # "jinhakapply" | "uwayapply"
    ratio_url: str | None    # None = 아직 미공개 (접수 전)
    accept_start: datetime | None = None
    accept_end: datetime | None = None
    in_scope: bool = True
    publish_until: datetime | None = None
    note: str = ""
    category: str = "4년제"
    campus: str | None = None
    dept_count: int = 0


def _load_all_universities() -> list[University]:
    import json
    from pathlib import Path
    
    # Try loading from universities_summary.json
    summary_path = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "data" / "universities_summary.json"
    if summary_path.exists():
        try:
            with open(summary_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            loaded = []
            for u in data.get("universities", []):
                k = u.get("key")
                cat = u.get("category", "4년제")
                reg = u.get("region") or (u.get("regions", ["전국"])[0] if u.get("regions") else "전국")
                loaded.append(University(
                    key=k,
                    full_name=u.get("fullName", k),
                    region=reg,
                    platform=u.get("platform", "jinhakapply"),
                    ratio_url=u.get("ratioUrl"),
                    accept_start=None,
                    accept_end=None,
                    in_scope=True,
                    category=cat,
                    campus=u.get("campus"),
                    dept_count=u.get("deptCount", 0),
                    note=f"{cat} ({u.get('deptCount', 0)}개 모집단위)"
                ))
            if loaded:
                return loaded
        except Exception as e:
            pass

    # Fallback default
    return [
        University("경인교대", "경인교육대학교", "인천", "jinhakapply", "https://addon.jinhakapply.com/RatioV1/RatioH/Ratio20060251.html", category="교대"),
        University("서울교대", "서울교육대학교", "서울", "uwayapply", "https://ratio.uwayapply.com/Sl5KYDpXJkpmJSY6Jko3ZlRm", category="교대"),
        University("KAIST", "한국과학기술원(KAIST)", "대전", "uwayapply", "https://ratio.uwayapply.com/Sl5KMCYlODlKXiUmOiZKN2ZUZg==", category="과기원/특수대"),
    ]

UNIVERSITIES: list[University] = _load_all_universities()


def normalize_uway_url(url: str) -> str:
    """'https://ratio.uwayapply.com/power/?ratioURL=%2F%2Fratio.uwayapply.com%2FXXX%3D&...' -> 'https://ratio.uwayapply.com/XXX='"""
    from urllib.parse import urlparse, parse_qs, unquote
    p = urlparse(url)
    if p.path.startswith("/power") and "ratioURL" in parse_qs(p.query):
        inner = unquote(parse_qs(p.query)["ratioURL"][0])
        return "https:" + inner if inner.startswith("//") else inner
    return url


def in_scope() -> list[University]:
    return [u for u in UNIVERSITIES if u.in_scope]


def by_key(key: str) -> University:
    match = next((u for u in UNIVERSITIES if u.key == key), None)
    if match:
        return match
    # Partial match fallback
    match = next((u for u in UNIVERSITIES if key in u.key or u.key in key), None)
    if match:
        return match
    raise KeyError(f"University '{key}' not found.")

