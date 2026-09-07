"""
collector/main.py — 교대 수시 경쟁률 자동 수집 시스템 CLI 진입점

사용법:
  python main.py --label 09월07일20시 [--univ 경인교대] [--report]
  python main.py --report                   # 기존 스냅샷 기반 보고서만 생성
  python main.py --watch                    # 수동 실행 명령 대기 모드
  python main.py --list-schedule            # 대학별 수집 일정 출력
"""
from __future__ import annotations
import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# sys.path 설정
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from collector.config.universities import UNIVERSITIES, in_scope, by_key, University
from collector.config.schedule import generate_rounds, get_current_label
from collector.scraper.browser import create_browser_session
from collector.scraper.capture import take_screenshot
from collector.scraper.parsers.base import Snapshot, Table
from collector.scraper.parsers.jinhakapply import parse_jinhakapply
from collector.scraper.parsers.uwayapply import parse_uwayapply
from collector.storage.backdata_xlsx import save_backdata_xlsx
from collector.storage.drive_repo import DriveRepo
from collector.storage.firestore_repo import FirestoreRepo
from collector.report.report_builder import build_team_report, build_single_univ_report

KST = ZoneInfo("Asia/Seoul")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("Collector")


async def collect_single_university(
    context,
    univ: University,
    label: str,
    captured_at_dt: datetime,
    drive_repo: DriveRepo,
    firestore_repo: FirestoreRepo,
    is_auto: bool = False,
    dry_run: bool = False,
) -> dict:
    """단일 대학 웹 스크래핑, 캡쳐, 백데이터 생성 및 Drive/Firestore 저장."""
    ts_file = captured_at_dt.strftime("%Y%m%d_%H%M")
    captured_at_iso = captured_at_dt.isoformat()
    mode_str = "자동" if is_auto else "수동"

    result = {
        "univ": univ.key,
        "label": label,
        "mode": mode_str,
        "status": "ok",
        "message": "",
        "screenshot": {},
        "backdata": {},
        "summary": {},
    }

    # 1. 접수 전 또는 URL 없음 검사
    if not univ.ratio_url:
        logger.warning(f"[{univ.key}] 경쟁률 URL이 등록되지 않음 — 건너뜁니다.")
        result["status"] = "skip"
        result["message"] = "URL 미등록"
        return result

    if univ.accept_start and captured_at_dt < univ.accept_start:
        logger.info(f"[{univ.key}] 접수 시작 전({univ.accept_start.strftime('%m/%d %H:%M')}) — 건너뜁니다.")
        result["status"] = "skip"
        result["message"] = f"접수 시작 전 ({univ.accept_start.strftime('%m/%d %H:%M')})"
        return result

    page = None
    try:
        page = await context.new_page()
        logger.info(f"[{univ.key}] 페이지 접속 중: {univ.ratio_url}")
        
        # 초고속 페이지 로딩 (domcontentloaded 우선 로드)
        try:
            await page.goto(univ.ratio_url, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(1.0)  # JS 렌더링 대기
        except Exception:
            await page.goto(univ.ratio_url, timeout=20000)

        # 2. 스크린샷 캡쳐
        out_img_name = f"{univ.key}_{mode_str}_{label}_{ts_file}.png"
        if "최종" in label:
            out_img_name = f"{univ.key}_최종_{mode_str}_{ts_file}.png"
        local_img_path = ROOT_DIR / "out" / "captures" / univ.key / out_img_name
        
        await take_screenshot(page, local_img_path, univ.key, label, captured_at_dt, is_auto=is_auto)
        logger.info(f"[{univ.key}] 스크린샷 캡쳐 완료: {out_img_name}")

        # 3. 플랫폼별 파싱
        if univ.platform == "jinhakapply":
            snapshot = await parse_jinhakapply(page, label, captured_at_iso)
        elif univ.platform == "uwayapply":
            snapshot = await parse_uwayapply(page, label, captured_at_iso)
        else:
            snapshot = Snapshot(label=label, captured_at=captured_at_iso, tables=[], status="error", error_message="미지원 플랫폼")

        result["status"] = snapshot.status
        result["summary"] = snapshot.summary
        result["message"] = snapshot.error_message or ""

        if snapshot.status == "error" or not snapshot.tables:
            logger.error(f"[{univ.key}] 표 추출 실패: {snapshot.error_message}")
            html_dump_path = ROOT_DIR / "out" / "dumps" / f"{univ.key}_{mode_str}_{ts_file}.html"
            html_dump_path.parent.mkdir(parents=True, exist_ok=True)
            content = await page.content()
            html_dump_path.write_text(content, encoding="utf-8")
        else:
            logger.info(f"[{univ.key}] 표 {len(snapshot.tables)}개 파싱 성공 (총 지원: {snapshot.summary.get('jiwon', 0)}명, 경쟁률: {snapshot.summary.get('ratio', '-')})")

        if dry_run:
            logger.info(f"[{univ.key}] dry-run 모드로 저장을 건너뜁니다.")
            return result

        # 4. 백데이터 엑셀 생성
        out_xlsx_name = f"{univ.key}_{mode_str}_{label}_{ts_file}.xlsx"
        local_xlsx_path = ROOT_DIR / "out" / "backdata" / univ.key / out_xlsx_name
        save_backdata_xlsx(local_xlsx_path, univ.full_name, univ.ratio_url, snapshot, screenshot_name=out_img_name)

        # 5. Drive 저장소 업로드 (대학별 폴더 자동 생성 및 저장)
        img_meta = drive_repo.upload_file(local_img_path, univ.key)
        xlsx_meta = drive_repo.upload_file(local_xlsx_path, univ.key)
        result["screenshot"] = img_meta
        result["backdata"] = xlsx_meta

        # 6. Firestore 데이터베이스 저장
        firestore_repo.save_snapshot(
            univ_key=univ.key,
            doc_id=ts_file,
            snapshot=snapshot,
            screenshot_meta=img_meta,
            backdata_meta=xlsx_meta,
        )

    except Exception as e:
        logger.exception(f"[{univ.key}] 수집 중 예외 발생: {e}")
        result["status"] = "error"
        result["message"] = str(e)
    finally:
        if page:
            await page.close()

    return result


async def run_collector(
    label: str | None = None,
    univ_keys: list[str] | None = None,
    include_all: bool = False,
    generate_report: bool = False,
    is_final: bool = False,
    is_auto: bool = False,
    dry_run: bool = False,
):
    """전체 수집 프로세스 총괄 실행기."""
    captured_at = datetime.now(KST)
    if not label:
        label = get_current_label(captured_at)
        if is_final:
            label = "최종"

    mode_label = "정기자동" if is_auto else "수동실행"
    logger.info(f"=== 교대 수시 경쟁률 수집 시작 [{mode_label}] (회차: {label}, 시각: {captured_at.strftime('%Y-%m-%d %H:%M:%S')} KST) ===")

    # 대상 대학 선별
    target_univs: list[University] = []
    if univ_keys:
        for k in univ_keys:
            try:
                target_univs.append(by_key(k))
            except StopIteration:
                logger.error(f"대학 약칭 '{k}'을 찾을 수 없습니다.")
    else:
        target_univs = UNIVERSITIES if include_all else in_scope()

    drive_repo = DriveRepo()
    firestore_repo = FirestoreRepo()

    # 대학 메타 정보 동기화
    for u in target_univs:
        firestore_repo.save_university_meta(u.key, {
            "key": u.key,
            "fullName": u.full_name,
            "region": u.region,
            "platform": u.platform,
            "ratioUrl": u.ratio_url,
            "acceptStart": u.accept_start.isoformat() if u.accept_start else None,
            "acceptEnd": u.accept_end.isoformat() if u.accept_end else None,
            "inScope": u.in_scope,
            "note": u.note,
        })

    # 고속 동시 실행 (최대 8개 대학 동시 병렬 처리)
    sem = asyncio.Semaphore(8)
    results = []

    async def worker(u: University):
        async with sem:
            return await collect_single_university(
                context, u, label, captured_at, drive_repo, firestore_repo, is_auto=is_auto, dry_run=dry_run
            )

    async with create_browser_session(headless=True) as context:
        tasks = [worker(u) for u in target_univs]
        results = await asyncio.gather(*tasks)

    # 실행 요약 보고서
    logger.info("=== 수집 완료 요약 ===")
    ok_count = sum(1 for r in results if r["status"] == "ok")
    skip_count = sum(1 for r in results if r["status"] == "skip")
    err_count = sum(1 for r in results if r["status"] == "error")
    logger.info(f"성공: {ok_count}개 | 건너뜀: {skip_count}개 | 실패: {err_count}개")
    for r in results:
        status_icon = "✅" if r["status"] == "ok" else ("⏭️" if r["status"] == "skip" else "❌")
        summary_txt = ""
        if r["summary"]:
            summary_txt = f" (지원 {r['summary'].get('jiwon', 0)}명, {r['summary'].get('ratio', '-')})"
        logger.info(f" {status_icon} {r['univ']:6s}: {r['status']:6s} {r['message']}{summary_txt}")

    # 실행 로그 저장
    run_id = captured_at.strftime("%Y%m%d_%H%M%S")
    firestore_repo.save_run_log(run_id, {
        "runId": run_id,
        "label": label,
        "startedAt": captured_at.isoformat(),
        "finishedAt": datetime.now(KST).isoformat(),
        "total": len(target_univs),
        "ok": ok_count,
        "skip": skip_count,
        "error": err_count,
        "results": {r["univ"]: r["status"] for r in results},
    })

    # 마감일 15시 회차 또는 --report / --final 인 경우 취합 보고서 생성
    if generate_report or "15시" in label or is_final:
        logger.info("=== 취합 보고서(통합 엑셀) 생성 중 ===")
        all_snapshots: dict[str, list[Snapshot]] = {}
        for u in in_scope():
            snaps = firestore_repo.get_snapshots_for_univ(u.key)
            if snaps:
                all_snapshots[u.key] = snaps

        if all_snapshots:
            ts_str = captured_at.strftime("%Y%m%d_%H%M")
            team_report_filename = f"2027대입_수시모집경쟁률취합_정보분석3팀_교대_{ts_str}.xlsx"
            local_report_path = ROOT_DIR / "out" / "reports" / team_report_filename

            report_path, warns = build_team_report(all_snapshots, local_report_path)
            upload_res = drive_repo.upload_file(report_path, "_취합보고서")
            logger.info(f"🎉 팀 취합 보고서 생성 완료: {report_path.name}")
            logger.info(f"📎 Drive/로컬 링크: {upload_res.get('webViewLink') or upload_res.get('localPath')}")
            if warns:
                logger.warning(f"⚠️ 취합 보고서 병합 경고 {len(warns)}건 발생 (엑셀 내 _경고 시트 확인)")
        else:
            logger.warning("취합 보고서 생성을 위한 스냅샷 데이터가 없습니다.")


def print_schedules():
    """대학별 수집 일정표 출력."""
    print("\n" + "=" * 70)
    print(" 2027 수시 교대 경쟁률 수집 일정표")
    print("=" * 70)
    for u in in_scope():
        rounds = generate_rounds(u)
        print(f"\n🏛️ [{u.key} ({u.full_name})] - {u.platform} / 총 {len(rounds)}회차")
        for r in rounds:
            final_tag = " (최종/수동)" if r.is_final else ""
            print(f"  • {r.label:14s} -> {r.scheduled_at.strftime('%Y-%m-%d %H:%M')} KST{final_tag}")
    print("\n" + "=" * 70)


def print_universities():
    """대학 목록 및 URL 등록 상태 출력."""
    print("\n" + "=" * 80)
    print(f"{'대학약칭':8s} {'정식명칭':16s} {'플랫폼':12s} {'대상':6s} {'접수기간':24s} {'경쟁률 URL'}")
    print("-" * 80)
    for u in UNIVERSITIES:
        scope = "포함" if u.in_scope else "제외(팀)"
        period = f"{u.accept_start.strftime('%m/%d')}~{u.accept_end.strftime('%m/%d')}" if u.accept_start and u.accept_end else "확인필요"
        url = u.ratio_url or "(URL 미확인)"
        print(f"{u.key:8s} {u.full_name:16s} {u.platform:12s} {scope:6s} {period:24s} {url}")
    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="2027 수시 교대 경쟁률 자동 수집 시스템")
    parser.add_argument("--label", type=str, help="수집 회차 라벨 (예: 09월07일20시, 최종)")
    parser.add_argument("--univ", type=str, nargs="+", help="수집 대상 대학 약칭 (예: 경인교대 청주교대)")
    parser.add_argument("--all", action="store_true", help="과기원 포함 모든 대학 수집")
    parser.add_argument("--auto", action="store_true", help="스케줄러 자동 실행 플래그 (배너 및 파일명에 자동 표기)")
    parser.add_argument("--final", action="store_true", help="최종 마감 경쟁률 플래그")
    parser.add_argument("--report", action="store_true", help="취합 보고서 xlsx 생성")
    parser.add_argument("--dry-run", action="store_true", help="파일 저장 및 업로드 없이 크롤링만 테스트")
    parser.add_argument("--list-schedule", action="store_true", help="대학별 수집 일정표 출력")
    parser.add_argument("--list-univs", action="store_true", help="등록된 대학 목록 및 URL 출력")

    args = parser.parse_args()

    if args.list_schedule:
        print_schedules()
        return

    if args.list_univs:
        print_universities()
        return

    asyncio.run(run_collector(
        label=args.label,
        univ_keys=args.univ,
        include_all=args.all,
        generate_report=args.report,
        is_final=args.final,
        is_auto=args.auto,
        dry_run=args.dry_run,
    ))



if __name__ == "__main__":
    main()
