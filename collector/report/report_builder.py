"""
collector/report/report_builder.py — 취합 보고서 생성기 (검증된 참조 구현 기반)

입력: 시간대별 스냅샷 목록. 각 스냅샷 = 웹페이지의 표(table) 목록. 표 = 2D 문자열/숫자 배열 (헤더 행 포함).
출력: 「2027대입_수시모집경쟁률취합」 양식과 동일한 시트
      - A~C열(고정열: 구분/모집단위/모집인원 등) + 시간대별 (지원인원, 경쟁률) 2열 쌍

핵심 규칙
  1. 각 표의 헤더 행에서 '지원인원', '경쟁률' 텍스트로 열 위치를 찾는다. (열 순서/개수가 표마다 달라도 안전)
  2. 나머지 열은 '고정열'로, 첫 스냅샷 값을 사용한다.
  3. 스냅샷 간 고정열 값이 다르면 해당 행을 노란색으로 표시하고 계속 진행한다. (중단 X)
  4. 표 개수/행 수가 스냅샷마다 다르면 표 제목 기준으로 맞추고, 못 맞추면 경고 시트에 기록한다.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
import openpyxl
from openpyxl.styles import Alignment, PatternFill, Font, Border, Side
from openpyxl.utils import get_column_letter

from collector.scraper.parsers.base import Table, Snapshot

Cell = Any  # str | int | float | None


@dataclass
class MergeWarning:
    univ: str
    table_title: str | None
    row_idx: int
    message: str


# --------------------------------------------------------------------------- #
# 1) 스냅샷 → 보고서 병합
# --------------------------------------------------------------------------- #
PAIR_HEADERS = ("지원인원", "경쟁률")


def _find_pair_cols(header: list[Cell]) -> tuple[int, int] | None:
    """헤더 행에서 (지원인원 열 idx, 경쟁률 열 idx) 반환. 없으면 None."""
    norm = [str(h).strip() if h is not None else "" for h in header]
    try:
        # '지원인원'과 '경쟁률'이 포함된 열 찾기
        ji_idx = None
        gr_idx = None
        for i, col in enumerate(norm):
            if "지원" in col and "인원" in col and ji_idx is None:
                ji_idx = i
            elif "경쟁" in col and "률" in col and gr_idx is None:
                gr_idx = i
            elif col == "지원인원" and ji_idx is None:
                ji_idx = i
            elif col == "경쟁률" and gr_idx is None:
                gr_idx = i

        if ji_idx is not None and gr_idx is not None:
            return ji_idx, gr_idx
        return norm.index("지원인원"), norm.index("경쟁률")
    except ValueError:
        return None


def merge_snapshots(univ_name: str, snaps: list[Snapshot]) -> tuple[list[list[Cell]], list[MergeWarning], list[tuple[int, int]]]:
    """
    반환: (시트 2D 배열, 경고 목록, 시간라벨 헤더 병합 범위[(col_start, col_end)])
    """
    assert snaps, "스냅샷이 없습니다"
    base = snaps[0]
    out: list[list[Cell]] = []
    warns: list[MergeWarning] = []

    for ti, btab in enumerate(base.tables):
        # 다른 스냅샷에서 같은 표 찾기 (제목 우선, 없으면 인덱스)
        others: list[Table | None] = []
        for s in snaps[1:]:
            match = next((t for t in s.tables if t.title == btab.title and btab.title), None)
            if match is None and ti < len(s.tables):
                match = s.tables[ti]
            others.append(match)

        if btab.title:
            out.append([btab.title])

        if not btab.rows:
            continue

        header = btab.rows[0]
        pair = _find_pair_cols(header)
        if pair is None:
            # 지원인원/경쟁률 없는 표는 그대로 복사
            out.extend(btab.rows)
            warns.append(MergeWarning(univ_name, btab.title, 0, f"표 '{btab.title}'에 지원인원/경쟁률 헤더 없음 — 원본 복사"))
            continue
        ji, gr = pair
        fixed_idx = [c for c in range(len(header)) if c not in (ji, gr)]

        for ri, brow in enumerate(btab.rows):
            new_row: list[Cell] = [brow[c] if c < len(brow) else None for c in fixed_idx]
            # 스냅샷별 (지원인원, 경쟁률) 붙이기
            for si, s in enumerate(snaps):
                tab = btab if si == 0 else others[si - 1]
                if tab is None or ri >= len(tab.rows):
                    new_row += [None, None]
                    warns.append(MergeWarning(univ_name, btab.title, ri, f"{s.label}: 표/행 누락"))
                    continue
                row = tab.rows[ri]
                # 고정열 검증 (헤더 행 제외)
                if ri > 0:
                    for c in fixed_idx:
                        a = brow[c] if c < len(brow) else None
                        b = row[c] if c < len(row) else None
                        if _norm(a) != _norm(b):
                            warns.append(MergeWarning(univ_name, btab.title, ri, f"{s.label}: 고정열 불일치 '{a}' vs '{b}'"))
                            break
                p = _find_pair_cols(tab.rows[0]) or (ji, gr)
                new_row += [row[p[0]] if p[0] < len(row) else None,
                            row[p[1]] if p[1] < len(row) else None]
            out.append(new_row)

    # 시간라벨 헤더 행을 맨 위에 삽입: [ '전체 경쟁률 현황', ..., label1, None, label2, None ... ]
    n_fixed = _n_fixed_cols(base)
    label_row: list[Cell] = ["전체 경쟁률 현황"] + [None] * (n_fixed - 1)
    merges = []
    for si, s in enumerate(snaps):
        c0 = n_fixed + si * 2 + 1  # 1-based
        label_row += [s.label, None]
        merges.append((c0, c0 + 1))
    note_row: list[Cell] = [None] * (n_fixed) + ["대학의 마감일에는 10시, 14/15시, 최종해주시면 됩니다."]
    return [label_row, note_row] + out, warns, merges


def _n_fixed_cols(snap: Snapshot) -> int:
    """첫 표(요약표) 기준 고정열 수. 표마다 다를 수 있으나 양식은 3열(A~C) 기준."""
    for t in snap.tables:
        if t.rows:
            p = _find_pair_cols(t.rows[0])
            if p:
                return len(t.rows[0]) - 2
    return 3


def _norm(v: Cell) -> str:
    if v is None:
        return ""
    s = str(v).strip()
    try:
        return str(float(s))
    except ValueError:
        return s


# --------------------------------------------------------------------------- #
# 2) 보고서 시트 쓰기 (양식 서식 재현)
# --------------------------------------------------------------------------- #
YELLOW = PatternFill("solid", fgColor="FFFF00")
THIN = Side(style="thin", color="000000")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def write_report_sheet(wb: openpyxl.Workbook, sheet_name: str, snaps: list[Snapshot]) -> list[MergeWarning]:
    grid, warns, merges = merge_snapshots(sheet_name, snaps)
    ws = wb.create_sheet(sheet_name[:31])
    for r, row in enumerate(grid, start=1):
        for c, v in enumerate(row, start=1):
            ws.cell(r, c, _coerce(v))

    # 1행: 시간라벨 병합 + 노란 배경 + 가운데
    ws.cell(1, 1).fill = YELLOW
    for c0, c1 in merges:
        ws.merge_cells(start_row=1, start_column=c0, end_row=1, end_column=c1)
        ws.cell(1, c0).alignment = Alignment(horizontal="center")
        ws.cell(1, c0).fill = YELLOW

    fixed_cols = _n_fixed_cols(snaps[0])
    ws.cell(2, fixed_cols + 1).fill = YELLOW

    ws.column_dimensions["A"].width = 23
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 12
    for c in range(4, ws.max_column + 1):
        ws.column_dimensions[get_column_letter(c)].width = 11
    ws.freeze_panes = "D4"
    return warns


def _coerce(v: Cell) -> Cell:
    """'123' → 123, '1.50 : 1' 은 문자열 유지."""
    if isinstance(v, str):
        s = v.strip()
        if s.isdigit():
            return int(s)
        try:
            if s.replace(".", "", 1).isdigit():
                return float(s)
        except Exception:
            pass
        return s
    return v


# --------------------------------------------------------------------------- #
# 3) 전체 보고서 파일 생성 (팀 통합본 & 대학별 파일)
# --------------------------------------------------------------------------- #
def build_team_report(
    univ_snapshots: dict[str, list[Snapshot]],
    output_path: Path,
) -> tuple[Path, list[MergeWarning]]:
    """
    모든 대학의 스냅샷을 모아 팀 통합 취합 보고서 생성.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # 기본 시트 제거

    all_warnings: list[MergeWarning] = []

    for univ_key, snaps in univ_snapshots.items():
        if not snaps:
            continue
        warns = write_report_sheet(wb, univ_key, snaps)
        all_warnings.extend(warns)

    # 경고 시트 추가 (경고가 있는 경우)
    if all_warnings:
        ws_warn = wb.create_sheet("_경고")
        ws_warn.append(["대학", "표 제목", "행 번호", "경고 내용"])
        for w in all_warnings:
            ws_warn.append([w.univ, w.table_title or "(요약)", w.row_idx, w.message])
        ws_warn.column_dimensions["A"].width = 15
        ws_warn.column_dimensions["B"].width = 30
        ws_warn.column_dimensions["C"].width = 10
        ws_warn.column_dimensions["D"].width = 50

    wb.save(output_path)
    return output_path, all_warnings


def build_single_univ_report(
    univ_key: str,
    snaps: list[Snapshot],
    output_path: Path,
) -> tuple[Path, list[MergeWarning]]:
    """
    단일 대학 취합 보고서 생성.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    warns = write_report_sheet(wb, univ_key, snaps)
    if warns:
        ws_warn = wb.create_sheet("_경고")
        ws_warn.append(["대학", "표 제목", "행 번호", "경고 내용"])
        for w in warns:
            ws_warn.append([w.univ, w.table_title or "(요약)", w.row_idx, w.message])

    wb.save(output_path)
    return output_path, warns
