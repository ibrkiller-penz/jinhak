"""
collector/storage/excel_importer.py — 백데이터 엑셀(08일~11일)을 스냅샷 JSON으로 변환
"""
import os
import json
import re
from pathlib import Path
import openpyxl

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

def import_all_backdata_excel():
    backdata_dirs = [
        ROOT_DIR / "out" / "backdata",
        ROOT_DIR / "out" / "drive",
        Path(r"C:\Users\pc\Downloads\gyodae-ratio"),
    ]
    
    fs_dir = ROOT_DIR / "out" / "firestore_data"
    fs_dir.mkdir(parents=True, exist_ok=True)

    imported_count = 0

    for base_dir in backdata_dirs:
        if not base_dir.exists():
            continue

        for xlsx_path in base_dir.glob(**/*.xlsx):
            if _meta in xlsx_path.name or 취합 in xlsx_path.name or xlsx_path.name.startswith(~$):
                continue

            try:
                univ_key = xlsx_path.parent.name
                if univ_key in [backdata, drive, _취합, reports, test_results, samples]:
                    continue

                wb = openpyxl.load_workbook(xlsx_path, data_only=True)
                meta = {}
                if _meta in wb.sheetnames:
                    ws_m = wb[_meta]
                    for r in ws_m.iter_rows(values_only=True):
                        if r and len(r) >= 2 and r[0] is not None:
                            meta[str(r[0]).strip()] = r[1]

                label = meta.get(수집 회차 라벨)
                if not label:
                    # 파일명에서 라벨 추출: e.g. 진주교대_수동_09월11일14시_20260911_1419.xlsx
                    m = re.search(r(\d+월\d+일\d+시|최종), xlsx_path.name)
                    if m:
                        label = m.group(1)
                    else:
                        data_sheets = [s for s in wb.sheetnames if s != _meta]
                        label = data_sheets[0] if data_sheets else xlsx_path.stem

                # doc_id 추출
                m_date = re.search(r(\d{8}_\d{4}), xlsx_path.name)
                doc_id = m_date.group(1) if m_date else fsnap_{label}

                captured_at = str(meta.get(수집 시각) or ")
 if not captured_at and m_date:
 d_str = m_date.group(1) # 20260908_2005
 captured_at = f{d_str[:4]}-{d_str[4:6]}-{d_str[6:8]}T{d_str[9:11]}:{d_str[11:13]}:00+09:00

 status = str(meta.get(수집 상태) or ok)
 notice = str(meta.get(공지/안내문) or )
 mojip = int(meta.get(총모집인원) or 0)
 jiwon = int(meta.get(지원인원) or 0)
 ratio = str(meta.get(총경쟁률) or -)

 # 데이터 시트 파싱
 ws_d = wb[label] if label in wb.sheetnames else wb.active
 rows = []
 for r in ws_d.iter_rows(values_only=True):
 if any(c is not None for c in r):
 rows.append([str(c) if c is not None else  for c in r])

 # summary 계산 (meta에 없는 경우 마지막 합계/총계 행에서 추출)
 if (jiwon == 0 or mojip == 0 or ratio == -) and rows:
 for row in reversed(rows):
 if any(총계 in str(cell) or 합계 in str(cell) for cell in row):
 # 숫자 셀 탐색
 nums = []
 for cell in row:
 try:
 n = int(str(cell).replace(,, ).strip())
 nums.append(n)
 except ValueError:
 pass
 if len(nums) >= 2:
 mojip = nums[0] if mojip == 0 else mojip
 jiwon = nums[1] if jiwon == 0 else jiwon
 for cell in row:
 if : in str(cell):
 ratio = str(cell).strip()
 break

 tables = [{title: f{univ_key} {label}, rows: rows}]

 snap_data = {
 label: label,
 capturedAt: captured_at,
 status: status,
 errorMessage: None,
 notice: notice,
 summary: {
 mojip: mojip,
 jiwon: jiwon,
 ratio: ratio
 },
 tables: tables,
 tablesJson: json.dumps(tables, ensure_ascii=False),
 screenshot: {},
 backdata: {
 fileName: xlsx_path.name,
 localPath: str(xlsx_path.resolve()),
 }
 }

 out_snap_dir = fs_dir / univ_key / snapshots
 out_snap_dir.mkdir(parents=True, exist_ok=True)
 out_file = out_snap_dir / f{doc_id}.json
 with open(out_file, w, encoding=utf-8) as f:
 json.dump(snap_data, f, ensure_ascii=False, indent=2)

 imported_count += 1
 except Exception as e:
 print(fError parsing {xlsx_path.name}: {e})

 print(fSuccessfully processed and generated {imported_count} snapshot files from Excel!)

if __name__ == __main__:
 import_all_backdata_excel()
