"""
config/schedule.py — 수집 일정 및 회차 자동 계산

규칙 (작업지시서 R1·R2):
1. 매일 저녁 20시 1회
2. 마감일은 3회: 아침 10시, 오후 15시, 최종 (수동/마감후)
3. 3일 접수 5회 / 4일 6회 / 5일 7회
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collector.config.universities import University

KST = ZoneInfo("Asia/Seoul")


@dataclass(frozen=True)
class CollectionRound:
    label: str               # 예: "09월07일20시", "09월11일10시", "09월11일15시", "최종"
    scheduled_at: datetime   # 예정 일시 (KST)
    is_final: bool = False
    is_manual: bool = False


def generate_rounds(univ: University) -> list[CollectionRound]:
    """대학의 accept_start, accept_end 기준 전체 수집 회차 목록 생성."""
    if not univ.accept_start or not univ.accept_end:
        return []

    start_date = univ.accept_start.date()
    end_date = univ.accept_end.date()
    rounds: list[CollectionRound] = []

    curr = start_date
    while curr <= end_date:
        if curr < end_date:
            # 중간 날짜는 저녁 20시 1회
            dt_20 = datetime.combine(curr, time(20, 0), tzinfo=KST)
            # 시작일인 경우 시작시간이 20시 이전이어야 함
            if dt_20 >= univ.accept_start:
                label = f"{curr.month:02d}월{curr.day:02d}일20시"
                rounds.append(CollectionRound(label=label, scheduled_at=dt_20))
        else:
            # 마감일: 10시, 14시, 15시, 최종
            dt_10 = datetime.combine(curr, time(10, 0), tzinfo=KST)
            dt_14 = datetime.combine(curr, time(14, 0), tzinfo=KST)
            dt_15 = datetime.combine(curr, time(15, 0), tzinfo=KST)
            dt_final = datetime.combine(curr, time(18, 0), tzinfo=KST)

            rounds.append(CollectionRound(label=f"{curr.month:02d}월{curr.day:02d}일10시", scheduled_at=dt_10))
            rounds.append(CollectionRound(label=f"{curr.month:02d}월{curr.day:02d}일14시", scheduled_at=dt_14))
            rounds.append(CollectionRound(label=f"{curr.month:02d}월{curr.day:02d}일15시", scheduled_at=dt_15))
            rounds.append(CollectionRound(label="최종", scheduled_at=dt_final, is_final=True, is_manual=True))
        curr += timedelta(days=1)

    return rounds


def get_current_label(now: datetime | None = None) -> str:
    """현재 시각 기준으로 가장 적절한 기본 라벨 반환."""
    if now is None:
        now = datetime.now(KST)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=KST)

    # 19:30 ~ 21:00 -> 20시
    if 19 <= now.hour <= 20:
        return f"{now.month:02d}월{now.day:02d}일20시"
    # 09:30 ~ 11:00 -> 10시
    elif 9 <= now.hour <= 10:
        return f"{now.month:02d}월{now.day:02d}일10시"
    # 14:30 ~ 16:00 -> 15시
    elif 14 <= now.hour <= 15:
        return f"{now.month:02d}월{now.day:02d}일15시"
    else:
        return f"{now.month:02d}월{now.day:02d}일{now.hour:02d}시"


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from collector.config.universities import in_scope
    for u in in_scope():
        rs = generate_rounds(u)
        print(f"[{u.key}] ({len(rs)}회): {', '.join(r.label for r in rs)}")
