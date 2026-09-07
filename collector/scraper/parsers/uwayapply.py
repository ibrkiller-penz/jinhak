"""
collector/scraper/parsers/uwayapply.py — 유웨이어플라이 경쟁률 페이지 파서
"""
from __future__ import annotations
import asyncio
import re
from playwright.async_api import Page
from collector.scraper.parsers.base import (
    Table,
    Snapshot,
    extract_all_tables_from_page,
    extract_summary_from_tables,
    clean_cell_text,
)


async def parse_uwayapply(page: Page, label: str, captured_at: str) -> Snapshot:
    """
    유웨이어플라이(ratio.uwayapply.com) 경쟁률 페이지 파싱.
    JS 렌더링, 탭/아코디언 구조, iframe 및 안내문 대응.
    """
    # 1. 페이지 로드 대기
    try:
        await page.wait_for_selector("table", timeout=20000)
    except Exception:
        body_text = await page.inner_text("body")
        return Snapshot(
            label=label,
            captured_at=captured_at,
            tables=[],
            status="skip" if ("준비" in body_text or "접수" in body_text) else "error",
            error_message=f"유웨이 테이블 로드 실패: {body_text[:100]}",
        )

    # 2. 공지 안내문 텍스트 추출 (예: '마감일 12:00까지 공개', '10분 주기 업데이트' 등)
    notice = await page.evaluate("""() => {
        const candidates = document.querySelectorAll('.notice, .info, .txt_info, .noti, .guide, #notice, .footer_info, .comment');
        const texts = [];
        for (const el of candidates) {
            const t = el.innerText ? el.innerText.trim() : '';
            if (t && t.length > 5) texts.push(t);
        }
        return texts.join(' | ') || null;
    }""")

    # 3. 탭(Tab) 요소 탐색 및 순회 (탭으로 나뉜 경우 모든 탭의 표 수집)
    tab_selectors = [
        ".tab_list a", ".tabs a", "ul.tab li a", ".nav-tabs a",
        "div[role='tablist'] button", ".tab_menu a"
    ]
    
    found_tabs = None
    for sel in tab_selectors:
        tabs = await page.query_selector_all(sel)
        if len(tabs) > 1:
            found_tabs = (sel, len(tabs))
            break

    all_tables: list[Table] = []

    if found_tabs:
        sel, count = found_tabs
        for idx in range(count):
            try:
                tabs = await page.query_selector_all(sel)
                if idx < len(tabs):
                    tab_name = await tabs[idx].inner_text()
                    await tabs[idx].click()
                    await page.wait_for_timeout(500)
                    tables = await extract_all_tables_from_page(page)
                    for t in tables:
                        # 탭 이름을 제목에 보강
                        if not t.title and tab_name:
                            t.title = clean_cell_text(tab_name)
                        # 중복 표 방지
                        if not any(existing.rows == t.rows for existing in all_tables):
                            all_tables.append(t)
            except Exception:
                pass
    
    if not all_tables:
        # 단일 페이지 또는 탭이 없는 경우 일반 추출
        all_tables = await extract_all_tables_from_page(page)

    # 4. 요약 생성
    summary = extract_summary_from_tables(all_tables)

    return Snapshot(
        label=label,
        captured_at=captured_at,
        tables=all_tables,
        status="ok" if all_tables else "error",
        notice=clean_cell_text(notice) if notice else None,
        summary=summary,
    )
