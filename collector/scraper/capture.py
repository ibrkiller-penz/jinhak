"""
collector/scraper/capture.py — 실시간 경쟁률 페이지 스크린샷 캡쳐
"""
from __future__ import annotations
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")


async def take_screenshot(
    page,
    output_path: Path,
    univ_name: str,
    label: str,
    timestamp: datetime | None = None,
    is_auto: bool = False,
) -> Path:
    """
    페이지 상단에 수집 시각 및 자동/수동 증빙 배너를 삽입하고 fullPage 스크린샷 저장.
    """
    if timestamp is None:
        timestamp = datetime.now(KST)

    ts_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
    mode_str = "정기자동" if is_auto else "수동실행"
    bg_color = "rgba(15, 23, 42, 0.92)" if is_auto else "rgba(30, 58, 138, 0.92)"

    # 상단 증빙 배너 오버레이 주입
    try:
        await page.evaluate(f"""() => {{
            const existing = document.getElementById('agy-capture-banner');
            if (existing) existing.remove();

            const banner = document.createElement('div');
            banner.id = 'agy-capture-banner';
            banner.style.position = 'fixed';
            banner.style.top = '12px';
            banner.style.right = '12px';
            banner.style.zIndex = '999999';
            banner.style.backgroundColor = '{bg_color}';
            banner.style.color = '#ffffff';
            banner.style.padding = '10px 18px';
            banner.style.borderRadius = '8px';
            banner.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            banner.style.fontSize = '14px';
            banner.style.fontWeight = '700';
            banner.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.35)';
            banner.style.border = '1.5px solid rgba(255, 255, 255, 0.25)';
            banner.innerText = '📸 [{mode_str}] {univ_name} | {label} ({ts_str} KST)';
            document.body.appendChild(banner);
        }}""")
    except Exception as e:
        pass

    output_path.parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(output_path), full_page=True)
    return output_path

