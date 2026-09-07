"""
collector/scraper/browser.py — Playwright 브라우저 컨텍스트 관리
"""
from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from playwright.async_api import async_playwright, Browser, BrowserContext, Playwright

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


@asynccontextmanager
async def create_browser_session(headless: bool = True):
    """Playwright Chromium 브라우저 및 한국어 최적화 컨텍스트 생성기."""
    async with async_playwright() as pw:
        browser: Browser = await pw.chromium.launch(
            headless=headless,
            args=[
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
            ],
        )
        context: BrowserContext = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=DEFAULT_USER_AGENT,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            device_scale_factor=1,
        )
        try:
            yield context
        finally:
            await context.close()
            await browser.close()
