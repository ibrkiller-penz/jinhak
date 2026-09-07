"""
collector/scraper/parsers/jinhakapply.py — 진학사 경쟁률 페이지 파서
"""
from __future__ import annotations
import re
from playwright.async_api import Page
from collector.scraper.parsers.base import (
    Table,
    Snapshot,
    extract_all_tables_from_page,
    extract_summary_from_tables,
    clean_cell_text,
)


async def parse_jinhakapply(page: Page, label: str, captured_at: str) -> Snapshot:
    """
    진학사(addon.jinhakapply.com) 경쟁률 페이지 파싱.
    """
    # 1. 페이지 로드 대기 (테이블 로드 확인)
    try:
        await page.wait_for_selector("table", timeout=15000)
    except Exception as e:
        # 테이블이 없을 경우 (준비중 등)
        body_text = await page.inner_text("body")
        return Snapshot(
            label=label,
            captured_at=captured_at,
            tables=[],
            status="skip" if ("준비" in body_text or "접수" in body_text) else "error",
            error_message=f"테이블을 찾을 수 없음: {body_text[:100]}",
        )

    # 2. 공지 안내문 텍스트 추출 (있는 경우)
    notice = await page.evaluate("""() => {
        const candidates = document.querySelectorAll('.notice, .info, .txt_info, #notice, .footer_info, p.info');
        const texts = [];
        for (const el of candidates) {
            const t = el.innerText ? el.innerText.trim() : '';
            if (t) texts.push(t);
        }
        return texts.join(' | ') || null;
    }""")

    # 3. 모든 표 추출
    tables = await extract_all_tables_from_page(page)

    # 4. 요약 생성
    summary = extract_summary_from_tables(tables)

    return Snapshot(
        label=label,
        captured_at=captured_at,
        tables=tables,
        status="ok" if tables else "error",
        notice=clean_cell_text(notice) if notice else None,
        summary=summary,
    )
