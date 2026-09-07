"""
collector/scraper/parsers/base.py — 파서 기본 데이터 구조 및 공통 HTML 테이블 추출기
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


@dataclass
class Table:
    title: str | None               # 표 제목 (예: "학생부교과전형 (추천형) 경쟁률 현황")
    rows: list[list[str]]          # 직사각형 2D 문자열 배열 (첫 행 = 헤더)


@dataclass
class Snapshot:
    label: str                      # 수집 라벨 (예: "09월07일20시", "최종")
    captured_at: str                # ISO 8601 KST (예: "2026-09-07T20:00:00+09:00")
    tables: list[Table]             # 수집된 표 목록
    status: str = "ok"              # "ok" | "skip" | "error" | "partial"
    error_message: str | None = None
    notice: str | None = None       # 페이지 공지사항 (예: "10분 단위 공지, 15:00 마감")
    summary: dict[str, Any] = field(default_factory=dict)  # {mojip: int, jiwon: int, ratio: str}


def clean_cell_text(text: str | None) -> str:
    """셀 텍스트 정제: 줄바꿈/전각공백/다중공백 정리 및 trim."""
    if text is None:
        return ""
    # 전각 공백(\u3000) 및 제어문자 정리
    cleaned = text.replace("\u3000", " ").replace("\xa0", " ")
    cleaned = re.sub(r"[\r\n\t]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


async def extract_table_from_element(table_element) -> tuple[str | None, list[list[str]]]:
    """
    Playwright ElementHandle(table)로부터 제목과 직사각형 2D 행 배열을 추출.
    rowspan과 colspan은 좌상단 셀에만 원본 텍스트를 넣고 나머지는 빈 문자열("")로 채움.
    """
    # 1. 표 제목 추출 (caption 또는 직전 형제 태그)
    title = await table_element.evaluate("""(table) => {
        // 1) caption 검사
        const cap = table.querySelector('caption');
        if (cap && cap.innerText.trim()) return cap.innerText.trim();

        // 2) 직전 형제 요소 검사
        let prev = table.previousElementSibling;
        while (prev) {
            const tag = prev.tagName.toLowerCase();
            const txt = prev.innerText ? prev.innerText.trim() : '';
            if (['h1','h2','h3','h4','h5','h6','p','div','strong','span'].includes(tag) && txt.length > 0) {
                // 현황, 경쟁률 등의 키워드가 있거나 짧은 제목일 경우
                if (txt.includes('현황') || txt.includes('경쟁률') || txt.length < 50) {
                    return txt;
                }
            }
            prev = prev.previousElementSibling;
        }

        // 3) 부모의 이전 형제 검사
        const parent = table.parentElement;
        if (parent && parent.previousElementSibling) {
            const ptxt = parent.previousElementSibling.innerText ? parent.previousElementSibling.innerText.trim() : '';
            if (ptxt && (ptxt.includes('현황') || ptxt.includes('경쟁률') || ptxt.length < 50)) {
                return ptxt;
            }
        }
        return null;
    }""")

    if title:
        title = clean_cell_text(title)

    # 2. 행 및 rowspan/colspan 매트릭스 계산 (브라우저 내에서 고속 실행)
    rows_data: list[list[str]] = await table_element.evaluate("""(table) => {
        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length === 0) return [];

        const grid = [];
        for (let r = 0; r < trs.length; r++) {
            grid.push([]);
        }

        for (let r = 0; r < trs.length; r++) {
            const tr = trs[r];
            const cells = Array.from(tr.querySelectorAll('th, td'));
            let c = 0;

            for (const cell of cells) {
                // 비어있는 다음 열 위치 찾기
                while (grid[r][c] !== undefined) {
                    c++;
                }

                const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
                const text = (cell.innerText || '').trim();

                for (let dr = 0; dr < rowspan; dr++) {
                    const targetRow = r + dr;
                    while (grid.length <= targetRow) {
                        grid.push([]);
                    }
                    for (let dc = 0; dc < colspan; dc++) {
                        const targetCol = c + dc;
                        if (dr === 0 && dc === 0) {
                            grid[targetRow][targetCol] = text;
                        } else {
                            grid[targetRow][targetCol] = '';
                        }
                    }
                }
                c += colspan;
            }
        }

        // 모든 행의 길이를 최대 열 개수로 맞춤
        let maxCols = 0;
        for (const row of grid) {
            if (row.length > maxCols) maxCols = row.length;
        }
        for (const row of grid) {
            while (row.length < maxCols) {
                row.push('');
            }
        }

        return grid;
    }""")

    # 문자열 정제
    cleaned_rows = [[clean_cell_text(c) for c in r] for r in rows_data if any(c != "" for c in r)]
    return title, cleaned_rows


async def extract_all_tables_from_page(page) -> list[Table]:
    """페이지 내 모든 table 요소를 파싱하여 Table 목록 반환."""
    table_handles = await page.query_selector_all("table")
    tables: list[Table] = []
    for th in table_handles:
        # 화면에 보이지 않는 숨김 표나 빈 표 제외 여부 검사
        is_visible = await th.is_visible()
        # 가끔 스크롤 영역에 있는 표는 is_visible이 false일 수 있으므로 행 개수로 판별
        title, rows = await extract_table_from_element(th)
        if rows and len(rows) > 0 and len(rows[0]) > 0:
            tables.append(Table(title=title, rows=rows))
    return tables


def extract_summary_from_tables(tables: list[Table]) -> dict[str, Any]:
    """수집된 표들에서 총계(총모집인원, 지원인원, 경쟁률)를 추출하여 요약 딕셔너리 생성."""
    summary = {"mojip": 0, "jiwon": 0, "ratio": "-"}
    if not tables:
        return summary

    for t in tables:
        for r in t.rows:
            if not r:
                continue
            first_cell = r[0].strip()
            if "총계" in first_cell or "합계" in first_cell or "전체" in first_cell:
                # 헤더에서 지원인원, 경쟁률, 모집인원 위치 탐색
                header = t.rows[0]
                norm_h = [h.strip() for h in header]
                mojip_idx = None
                jiwon_idx = None
                ratio_idx = None

                for idx, col in enumerate(norm_h):
                    if "모집" in col and "인원" in col and mojip_idx is None:
                        mojip_idx = idx
                    elif "지원" in col and "인원" in col and jiwon_idx is None:
                        jiwon_idx = idx
                    elif "경쟁" in col and ratio_idx is None:
                        ratio_idx = idx

                if jiwon_idx is not None and jiwon_idx < len(r):
                    j_str = re.sub(r"[^\d]", "", r[jiwon_idx])
                    if j_str.isdigit():
                        summary["jiwon"] = int(j_str)
                if mojip_idx is not None and mojip_idx < len(r):
                    m_str = re.sub(r"[^\d]", "", r[mojip_idx])
                    if m_str.isdigit():
                        summary["mojip"] = int(m_str)
                if ratio_idx is not None and ratio_idx < len(r):
                    summary["ratio"] = r[ratio_idx].strip()
                return summary

    return summary
