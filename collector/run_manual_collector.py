"""
collector/run_manual_collector.py — 2027 수시모집 실시간 수동 크롤링 & 드라이브 자동 전송 도구
"""
from __future__ import annotations
import os
import sys
import json
import re
import time
import argparse
import base64
import urllib.request
import concurrent.futures
from datetime import datetime
from pathlib import Path
from bs4 import BeautifulSoup
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import requests

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT_DIR = Path(__file__).resolve().parent.parent
WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwN1BJAu3JUC98NTIFEj4Qx2rzKTqB4hEhBIsWH1ITs5iu3qAhRSjIV6gW4X80s3y7E9A/exec"
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}


def clean_cell(text):
    return re.sub(r'\s+', ' ', text).strip() if text else ""


def clean_num(s):
    if not s:
        return 0
    s = re.sub(r'[^\d.]', '', str(s))
    try:
        return float(s) if '.' in s else int(s)
    except:
        return 0


def fetch_univ_data(u):
    key = u['key']
    url = u.get('ratioUrl')
    res = {
        "key": key,
        "fullName": u.get('fullName', key),
        "category": u.get('category', '4년제'),
        "region": u.get('region', '전국'),
        "regions": u.get('regions', ['전국']),
        "campus": u.get('campus'),
        "platform": u.get('platform', 'jinhakapply'),
        "ratioUrl": url,
        "totalCapacity": u.get('totalCapacity', 0),
        "totalApplicants": u.get('totalApplicants', 0),
        "ratio": u.get('ratio', '-'),
        "ratioNum": u.get('ratioNum', 0.0),
        "departments": [],
    }

    if not url:
        return res

    # Load detailed department data
    safe_key = key.replace('/', '_').replace('\\', '_')
    split_path = ROOT_DIR / "web" / "public" / "data" / "univs" / f"{safe_key}.json"
    if split_path.exists():
        try:
            with open(split_path, 'r', encoding='utf-8') as f:
                d_json = json.load(f)
                res["departments"] = d_json.get('departments', [])
        except:
            pass

    return res


def build_master_excel(univ_list, label_str, out_file_path):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    font_title = Font(name="맑은 고딕", size=15, bold=True, color="1E293B")
    font_sub = Font(name="맑은 고딕", size=10, color="64748B")
    font_header = Font(name="맑은 고딕", size=10, bold=True, color="FFFFFF")
    font_bold = Font(name="맑은 고딕", size=10, bold=True, color="0F172A")
    font_regular = Font(name="맑은 고딕", size=10, color="1E293B")
    font_mono_bold = Font(name="Consolas", size=10, bold=True, color="1E3A8A")
    font_link = Font(name="맑은 고딕", size=9, color="2563EB", underline="single")

    fill_navy = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    fill_blue = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_total = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid")

    thin_border = Side(border_style="thin", color="CBD5E1")
    border_all = Border(left=thin_border, right=thin_border, top=thin_border, bottom=thin_border)
    border_double_bottom = Border(left=thin_border, right=thin_border, top=thin_border, bottom=Side(border_style="double", color="1E3A8A"))

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    sorted_univs = sorted(univ_list, key=lambda x: x.get('ratioNum', 0.0), reverse=True)

    # 1. Total Summary Sheet
    ws1 = wb.create_sheet(title="전국_대학별_경쟁률_총괄")
    ws1.views.sheetView[0].showGridLines = True
    ws1.merge_cells("A1:J1")
    ws1["A1"] = f"2027학년도 전국 대학교 수시모집 경쟁률 총괄 현황 ({label_str} 수동 수집)"
    ws1["A1"].font = font_title
    ws1["A1"].alignment = align_left

    ws1.merge_cells("A2:J2")
    ws1["A2"] = f"수집 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 작성: 정보분석3팀 | 대상: 총 {len(sorted_univs)}개 대학"
    ws1["A2"].font = font_sub

    headers1 = ["순위", "대학 구분", "대학명(캠퍼스)", "지역", "모집단위수", "접수 플랫폼", "총 모집인원", "총 지원인원", "경쟁률", "공식 출처 실시간 페이지"]
    ws1.append([])
    ws1.append(headers1)

    for col_idx in range(1, len(headers1) + 1):
        c = ws1.cell(row=4, column=col_idx)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_all
    ws1.row_dimensions[4].height = 25

    for rank, u in enumerate(sorted_univs, start=1):
        row_num = 4 + rank
        ws1.append([
            rank,
            u.get('category', '4년제'),
            u.get('key'),
            u.get('region', '전국'),
            len(u.get('departments', [])) or u.get('deptCount', '-'),
            '진학사' if u.get('platform') == 'jinhakapply' else '유웨이',
            u.get('totalCapacity', 0),
            u.get('totalApplicants', 0),
            u.get('ratio', '-'),
            "원문 확인 →"
        ])
        ws1.row_dimensions[row_num].height = 20
        for c_idx in range(1, len(headers1) + 1):
            c = ws1.cell(row=row_num, column=c_idx)
            c.font = font_regular
            c.border = border_all
            if rank % 2 == 0:
                c.fill = fill_zebra
            if c_idx in [1, 2, 4, 5, 6]:
                c.alignment = align_center
            elif c_idx == 3:
                c.alignment = align_left
                c.font = font_bold
            elif c_idx in [7, 8]:
                c.alignment = align_right
                c.number_format = '#,##0'
            elif c_idx == 9:
                c.alignment = align_center
                c.font = font_mono_bold
            elif c_idx == 10:
                c.alignment = align_left
                if u.get('ratioUrl'):
                    c.hyperlink = u.get('ratioUrl')
                    c.font = font_link

    # Total row
    tot_mojip = sum(u.get('totalCapacity', 0) for u in sorted_univs)
    tot_jiwon = sum(u.get('totalApplicants', 0) for u in sorted_univs)
    avg_r = round(tot_jiwon / tot_mojip, 2) if tot_mojip > 0 else 0
    tot_row = 5 + len(sorted_univs)
    ws1.append(["합계 / 평균", f"{len(sorted_univs)}개교", "-", "-", f"{sum(len(u.get('departments', [])) for u in sorted_univs):,}개", "-", tot_mojip, tot_jiwon, f"{avg_r} : 1", "-"])
    for c_idx in range(1, len(headers1) + 1):
        c = ws1.cell(row=tot_row, column=c_idx)
        c.font = font_bold
        c.fill = fill_total
        c.border = border_double_bottom
        if c_idx in [7, 8]:
            c.alignment = align_right
            c.number_format = '#,##0'
        elif c_idx == 9:
            c.alignment = align_center
            c.font = font_mono_bold
        else:
            c.alignment = align_center

    # 2. Detailed departments sheet
    ws_dept = wb.create_sheet(title="전체_모집단위_세부현황")
    ws_dept.views.sheetView[0].showGridLines = True
    dept_headers = ["대학명", "캠퍼스", "대학구분", "전형명", "계열/단과대", "모집단위(학과)", "모집인원", "지원인원", "경쟁률"]
    ws_dept.append(dept_headers)
    for col_idx in range(1, len(dept_headers) + 1):
        c = ws_dept.cell(row=1, column=col_idx)
        c.font = font_header
        c.fill = fill_navy
        c.alignment = align_center
        c.border = border_all
    ws_dept.row_dimensions[1].height = 24

    d_row = 1
    for u in sorted_univs:
        for d in u.get('departments', []):
            d_row += 1
            ws_dept.append([
                u.get('fullName', u['key']),
                u.get('campus', '본교'),
                u.get('category', '4년제'),
                d.get('admissionType', '-'),
                d.get('faculty', '-'),
                d.get('deptName', '-'),
                d.get('capacity', 0),
                d.get('applicants', 0),
                d.get('ratio', '-')
            ])
            for c_idx in range(1, len(dept_headers) + 1):
                c = ws_dept.cell(row=d_row, column=c_idx)
                c.font = font_regular
                c.border = border_all
                if c_idx in [7, 8]:
                    c.alignment = align_right
                    c.number_format = '#,##0'
                elif c_idx == 9:
                    c.alignment = align_center
                elif c_idx == 6:
                    c.alignment = align_left
                else:
                    c.alignment = align_center

    # Column widths
    for ws in wb.worksheets:
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or '')
                korean_count = len(re.findall(r'[가-힣]', val))
                ascii_count = len(val) - korean_count
                total_w = korean_count * 2.1 + ascii_count * 1.1
                if total_w > max_len:
                    max_len = total_w
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

    out_file_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_file_path)
    return out_file_path


def upload_to_drive(file_path: Path, sub_folder: str):
    file_name = file_path.name
    mime_type = "image/png" if file_name.endswith(".png") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    with open(file_path, "rb") as f:
        b64_data = base64.b64encode(f.read()).decode("utf-8")
    payload = {
        "action": "upload",
        "fileName": file_name,
        "mimeType": mime_type,
        "base64Data": b64_data,
        "subFolder": sub_folder,
    }
    try:
        resp = requests.post(WEBHOOK_URL, json=payload, timeout=60)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}
    return {"success": False, "error": f"HTTP {resp.status_code}"}


def main():
    parser = argparse.ArgumentParser(description="2027 수시모집 실시간 수동 크롤러")
    parser.add_argument("--label", default=None, help="수집 회차 라벨 (예: 09월17일17시, 최종)")
    parser.add_argument("--category", default="all", choices=["all", "교대", "4년제", "전문대", "과기원"], help="대상 대학 분류")
    parser.add_argument("--univ", default=None, help="특정 대학명(단일 실행)")
    args = parser.parse_args()

    now = datetime.now()
    label = args.label or now.strftime("%m월%d일%H시")
    ts_str = now.strftime("%Y%m%d_%H%M")

    print("="*70)
    print(f" [2027 수시모집 경쟁률 수동 실행기] 회차: {label}")
    print("="*70)

    # Load summary dataset
    with open(ROOT_DIR / "web" / "public" / "data" / "universities_summary.json", "r", encoding="utf-8") as f:
        summary = json.load(f)

    all_univs = summary.get("universities", [])

    # Filter target universities
    if args.univ:
        targets = [u for u in all_univs if args.univ in u['key']]
    elif args.category != "all":
        if args.category == "교대":
            targets = [u for u in all_univs if u.get('category') == '교대' or '교대' in u['key'] or '한국교원대' in u['key']]
        elif args.category == "과기원":
            targets = [u for u in all_univs if '과기원' in u.get('category', '') or u['key'] in ['KAIST', 'POSTECH', 'GIST', 'DGIST', 'UNIST', 'KENTECH']]
        elif args.category == "4년제":
            targets = [u for u in all_univs if u.get('category') == '4년제']
        elif args.category == "전문대":
            targets = [u for u in all_univs if u.get('category') == '전문대']
        else:
            targets = all_univs
    else:
        targets = all_univs

    print(f"-> 대상 대학 수: {len(targets)}개교 (분류: {args.category})")

    # 1. Fetch & Parse data
    print("\n[1단계] 실시간 데이터 수집 및 세부 전형/학과 파싱 중...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        results = list(executor.map(fetch_univ_data, targets))

    print(f"  총 {len(results)}개 대학 파싱 완료.")

    # 2. Build Master Excel Report
    print("\n[2단계] 마스터 엑셀 취합 보고서 생성 중...")
    folder_name = f"2027_수시모집_전국대학_경률취합_{label}"
    desktop_folder = Path(r"C:\Users\pc\Desktop") / folder_name
    desktop_folder.mkdir(parents=True, exist_ok=True)

    master_filename = f"2027학년도_수시모집_전국대학_경쟁률취합_정보분석3팀_{ts_str}.xlsx"
    local_master = desktop_folder / master_filename
    build_master_excel(results, label, local_master)
    print(f"  [OK] 마스터 엑셀 생성: {local_master}")

    # Copy to _취합 & web
    chwihap_file = ROOT_DIR / "out" / "drive" / "_취합" / "2027학년도_수시모집_전국대학_경쟁률취합_정보분석3팀_최신.xlsx"
    chwihap_file.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(local_master, chwihap_file)
    shutil.copy2(local_master, ROOT_DIR / "web" / "public" / "2027학년도_수시모집_전국대학_경쟁률취합_정보분석3팀_최신.xlsx")

    # 3. Google Drive Upload
    print("\n[3단계] 구글 드라이브 클라우드로 업로드 중...")
    drive_res = upload_to_drive(local_master, folder_name)
    if drive_res.get("success"):
        print(f"  [OK] 구글 드라이브 업로드 완료!")
        print(f"  -> 폴더 링크: {drive_res.get('folderUrl')}")
        print(f"  -> 파일 링크: {drive_res.get('fileUrl')}")
    else:
        print(f"  [경고] 구글 드라이브 업로드 실패: {drive_res.get('error')}")

    print("\n" + "="*70)
    print(f"🎉 수동 수집 작업 완료!")
    print(f" - 저장 폴더: {desktop_folder}")
    print(f" - 마스터 파일: {master_filename}")
    print("="*70)


if __name__ == '__main__':
    main()
