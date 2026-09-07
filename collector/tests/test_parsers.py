"""
collector/tests/test_parsers.py — 파서 검증 규칙 단위 테스트 (SPEC C-5)
"""
import re
import pytest
from collector.scraper.parsers.base import Table, Snapshot, extract_summary_from_tables, clean_cell_text


def test_clean_cell_text():
    assert clean_cell_text("  국어교육과\r\n\t  ") == "국어교육과"
    assert clean_cell_text("전각\u3000공백\xa0테스트") == "전각 공백 테스트"
    assert clean_cell_text(None) == ""


def test_parser_validation_rules():
    # C-5 검증 규칙 테스트용 모의 테이블
    mock_header = ["모집단위", "모집인원", "지원인원", "경쟁률"]
    mock_rows = [
        mock_header,
        ["초등교육과", "50", "150", "3.00 : 1"],
        ["특수교육과", "20", "40", "2.00 : 1"],
        ["총계", "70", "190", "2.71 : 1"],
    ]
    table = Table(title="일반전형 경쟁률 현황", rows=mock_rows)
    snap = Snapshot(
        label="09월07일20시",
        captured_at="2026-09-07T20:00:00+09:00",
        tables=[table],
    )

    # 규칙 1. 표 >= 1개, 헤더에 '지원인원'·'경쟁률' 존재
    assert len(snap.tables) >= 1
    header = snap.tables[0].rows[0]
    assert any("지원인원" in col or "지원" in col for col in header)
    assert any("경쟁률" in col or "경쟁" in col for col in header)

    # 규칙 2. 모든 행 길이 = 헤더 길이 (직사각형 보장)
    h_len = len(header)
    for r in snap.tables[0].rows:
        assert len(r) == h_len

    # 규칙 3. 경쟁률 셀 정규식 검사
    ratio_pattern = re.compile(r"^(\d+(\.\d+)?\s*:\s*1|-|\s*)$")
    ratio_idx = header.index("경쟁률")
    for r in snap.tables[0].rows[1:]:
        val = r[ratio_idx].strip()
        assert ratio_pattern.match(val), f"경쟁률 형식 불일치: {val}"

    # 규칙 4. 요약 추출 검증
    summary = extract_summary_from_tables(snap.tables)
    assert summary["mojip"] == 70
    assert summary["jiwon"] == 190
    assert summary["ratio"] == "2.71 : 1"
