# gyodae-ratio — 2027 수시 교대 경쟁률 취합 자동화 시스템

2027학년도 대입 수시모집 교대 계열 대학의 실시간 경쟁률을 **자동 수집(Playwright)**, **증빙 캡쳐(PNG)**, **시간별 백데이터(XLSX)** 및 **최종 통합 와이드 취합 보고서(XLSX)**로 자동 생성하는 시스템입니다.

---

## 🚀 빠른 시작 (Quick Start)

### 1. 웹 대시보드 실행 (GUI)
웹 브라우저에서 실시간 교대 경쟁률 현황 확인, 추이 차트, 증빙 캡쳐 열람 및 원클릭 즉시 수집을 실행할 수 있습니다.
```bash
# 윈도우 배치 파일 실행 (브라우저 자동 열림: http://localhost:8000)
scripts\run_dashboard.bat

# 또는 직접 파이썬 실행
python -m uvicorn collector.server:app --host 0.0.0.0 --port 8000
```

### 2. CLI 즉시 수집 실행
```bash
# 1) 현재 시각 기준 자동 라벨로 전체 교대 수집
python collector\main.py

# 2) 특정 회차 라벨 지정 수집 (예: 09월07일20시)
python collector\main.py --label 09월07일20시

# 3) 특정 대학만 수집 (예: 청주교대, 광주교대)
python collector\main.py --label 09월07일20시 --univ 청주교대 광주교대

# 4) 수집 후 팀 통합 취합 보고서 엑셀 즉시 생성
python collector\main.py --report

# 5) 마감일 최종 경쟁률 수집 및 보고서 출력
python collector\main.py --label 최종 --final --report
```

### 3. Windows 작업 스케줄러 자동 등록
지시서 일정(매일 20:00, 마감일 10:00/15:00)에 맞춰 Windows 작업 스케줄러에 일괄 등록합니다.
```powershell
powershell -ExecutionPolicy Bypass -File scripts\register_tasks.ps1
```

---

## 📁 디렉터리 구조

```text
gyodae-ratio/
├── collector/                       # Python 3.12 수집 엔진 및 백엔드
│   ├── main.py                      # CLI 진입점
│   ├── server.py                    # FastAPI 웹 대시보드 백엔드
│   ├── config/
│   │   ├── universities.py          # 대상 대학 메타데이터 & URL 설정
│   │   └── schedule.py              # 접수기간 기반 회차 자동 계산 (R1/R2)
│   ├── scraper/
│   │   ├── browser.py               # Playwright 브라우저 컨텍스트 세션 관리
│   │   ├── capture.py               # 타임스탬프 증빙 배너 오버레이 + Full-page PNG 캡쳐
│   │   └── parsers/
│   │       ├── base.py              # Table/Snapshot 데이터 모델 및 colspan/rowspan 보정기
│   │       ├── jinhakapply.py       # 진학사 경쟁률 파서
│   │       └── uwayapply.py         # 유웨이어플라이 경쟁률 파서 (JS/탭/공지 추출)
│   ├── storage/
│   │   ├── backdata_xlsx.py         # 단일 회차 백데이터 엑셀 생성
│   │   ├── firestore_repo.py        # Firebase Firestore + 로컬 JSON 폴백 DB
│   │   └── drive_repo.py            # Google Drive API + 로컬 out/ 폴백 저장소
│   ├── report/
│   │   └── report_builder.py        # ★ 와이드 취합 보고서 생성기 (검증 완료)
│   └── tests/
│       ├── test_parsers.py          # 파서 검증 규칙 단위 테스트
│       └── test_report_roundtrip.py # 연세대 예시 라운드트립 무결성 테스트 (3,003셀 일치)
├── web/                             # React + Vite + TypeScript 웹 대시보드
├── out/                             # 생성된 산출물 (자동 생성)
│   ├── captures/                    # 증빙 스크린샷 (.png)
│   ├── backdata/                    # 단일 회차 백데이터 (.xlsx)
│   ├── reports/                     # 팀 통합 및 대학별 취합 보고서 (.xlsx)
│   └── firestore_data/              # 스냅샷 및 실행 로그
├── scripts/
│   ├── run_dashboard.bat            # 웹 대시보드 원클릭 실행기
│   ├── run_collect.bat              # 수집기 실행 배치
│   └── register_tasks.ps1           # Windows 작업 스케줄러 등록 스크립트
└── samples/                         # 취합 양식 원본, 작업지시서, VBA 원본
```

---

## 🧪 테스트 검증 결과
```bash
python -m pytest collector/tests -v
```
- `test_yonsei_roundtrip`: 연세대 5개 회차 스냅샷 분해 및 재병합 라운드트립 **3,003셀 100% 일치 (불일치 0건, 경고 0건)**
- `test_clean_cell_text` & `test_parser_validation_rules`: 정규식, 헤더 규격, 2D 직사각형 검증 통과

---

## ⚙️ 설정 및 환경변수 (`.env`)
필요 시 `.env` 파일에 Google Drive 및 Firebase 자격증명 파일 경로를 지정할 수 있으며, 키가 없어도 모든 산출물은 `out/` 폴더에 완벽히 로컬 보존 및 웹 서빙됩니다.
```env
FIREBASE_CREDENTIALS_PATH=firebase_key.json
GDRIVE_CREDENTIALS_PATH=credentials.json
GDRIVE_ROOT_FOLDER_ID=your_folder_id
```
