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
    accept_start: datetime | None
    accept_end: datetime | None
    in_scope: bool = True
    publish_until: datetime | None = None
    note: str = ""


UNIVERSITIES: list[University] = [
    # ───────────── 교대 (in_scope=True) ─────────────
    University("경인교대", "경인교육대학교", "인천", "jinhakapply",
               "https://addon.jinhakapply.com/RatioV1/RatioH/Ratio20060251.html",
               kst("2026-09-07 09:00"), kst("2026-09-11 17:00"),
               publish_until=kst("2026-09-11 17:00"),
               note="2027 실시간 URL 확정 (10분마다 업데이트, 종료 시까지 공개)"),
    University("공주교대", "공주교육대학교", "충남", "uwayapply",
               None, kst("2026-09-08 10:00"), kst("2026-09-11 16:00"),
               note="9/8 접수 시작 후 URL 확인 (uwayapply 파워경쟁률)"),
    University("광주교대", "광주교육대학교", "광주", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KYDY6L3JXOE45SmYlJjomSjdmVGY=",
               kst("2026-09-07 09:00"), kst("2026-09-11 17:00"),
               note="2027 실시간 URL 확정"),
    University("대구교대", "대구교육대학교", "대구", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KYDpXVkpmJSY6Jko3ZlRm",
               kst("2026-09-07 10:00"), kst("2026-09-11 18:00"),
               note="2027 실시간 URL 확정"),
    University("부산교대", "부산교육대학교", "부산", "jinhakapply",
               "https://addon.jinhakapply.com/RatioV1/RatioH/Ratio20040281.html",
               kst("2026-09-07 10:00"), kst("2026-09-11 17:00"),
               publish_until=kst("2026-09-11 15:00"),
               note="2027 실시간 URL 확정 (10분 단위 공지, 11일 15:00까지)"),
    University("서울교대", "서울교육대학교", "서울", "uwayapply",
               None, kst("2026-09-08 10:00"), kst("2026-09-11 18:00"),
               note="9/8 접수 시작 후 URL 확인"),
    University("전주교대", "전주교육대학교", "전북", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KYDpXL0pmJSY6Jko3ZlRm",
               kst("2026-09-07 09:00"), kst("2026-09-11 17:00"),
               note="2027 실시간 URL 확정"),
    University("진주교대", "진주교육대학교", "경남", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KYDpMSmYlJjomSjdmVGY=",
               kst("2026-09-07 09:00"), kst("2026-09-11 18:00"),
               note="2027 실시간 URL 확정"),
    University("청주교대", "청주교육대학교", "충북", "jinhakapply",
               "https://addon.jinhakapply.com/RatioV1/RatioH/Ratio20100341.html",
               kst("2026-09-07 09:00"), kst("2026-09-11 17:00"),
               publish_until=kst("2026-09-11 16:00"),
               note="2027 실시간 URL 확정 (10분 단위 공지, 11일 16:00까지)"),
    University("춘천교대", "춘천교육대학교", "강원", "jinhakapply",
               "https://addon.jinhakapply.com/RatioV1/RatioH/Ratio20110331.html",
               kst("2026-09-07 09:00"), kst("2026-09-11 17:00"),
               publish_until=kst("2026-09-11 15:00"),
               note="2027 실시간 URL 확정 (11일 15:00까지 제공, 최종은 홈페이지 공지)"),
    University("한국교원대", "한국교원대학교", "충북", "jinhakapply",
               None, kst("2026-09-08 09:00"), kst("2026-09-11 18:00"),
               note="9/8 접수 시작 후 URL 확인 (진학사 단독)"),

    # ───────────── 과기원 (팀 담당, 기본 제외) ─────────────
    University("DGIST", "DGIST", "대구", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KMCYlclZKXiUmOiZKN2ZUZg==",
               kst("2026-09-03 09:00"), kst("2026-09-10 18:00"), in_scope=False),
    University("GIST", "GIST", "광주", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KbzBlbyZlbyVlb3JlSl4lJjomSjdmVGY=",
               kst("2026-09-07 09:00"), kst("2026-09-11 18:00"), in_scope=False),
    University("KAIST", "KAIST", "대전", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KMCYlODlKXiUmOiZKN2ZUZg==",
               None, kst("2026-09-09 18:00"), in_scope=False),
    University("KENTECH", "KENTECH", "전남", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KfExgMFdgOUpeJSY6Jko3ZlRm",
               kst("2026-09-08 10:00"), kst("2026-09-11 18:00"), in_scope=False),
    University("POSTECH", "POSTECH", "경북", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KfExgMCZhaUpmJSY6Jko3ZlRm",
               None, kst("2026-09-09 18:00"), in_scope=False),
    University("UNIST", "UNIST", "울산", "uwayapply",
               "https://ratio.uwayapply.com/Sl5KMCYlVzpKXiUmOiZKN2ZUZg==",
               kst("2026-09-03 09:00"), kst("2026-09-10 18:00"), in_scope=False),
]


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
    return next(u for u in UNIVERSITIES if u.key == key)
