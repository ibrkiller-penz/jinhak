# 2027학년도 수시모집 교대 경쟁률 취합 자동화 시스템

## Antigravity 구축 설명서 v2.0

> 작성일 2026-09-07(월) · 접수기간 9/7~9/11 · 대상: 교대 계열 11개교
> 기술: Python 3.11 수집기(Playwright·openpyxl) + Firebase Firestore + Google Drive API + React 대시보드(Vite·TS)

---

# PART A. 작업지시서 검토 결과

## A-1. 지시서(hwpx)가 요구하는 것

| # | 지시 내용 | 원문 근거 |
|---|---------|---------|
| R1 | **취합 횟수**: 매일 저녁 20시 1회, 마감일은 3회(10시·15시·최종) | "하루에 한 번 저녁 20시, 마지막 날은 세 번 아침 10시, 오후 3시, 최종" |
| R2 | 3일 접수 5회 / 4일 6회 / **5일 7회** | 동일 |
| R3 | 「실시간경쟁률 작업용」xlsb 매크로로 **그 시간 기준 파일 자동 생성** (`yyyymmddhhmm기준.xlsx`) | VBA `A실행` 분석 결과 |
| R4 | 생성 파일 → 「2027대입_수시모집경쟁률 취합_개 대학(팀)」에 **값으로 붙여넣기**로 담당 대학 시트 완성 | 지시서 2항 |
| R5 | 마감일 **15시 경쟁률까지 취합 → 팀별로 112명 톡방 탑재** | 지시서 3항 |
| R6 | **대학별 마감일 확인** 후 작업 (마감일이 다르면 10·15·최종 시점이 다름) | ※ 주의문 |

## A-2. 최종 보고 양식 (첨부 xlsx) 구조 — 확정

```
대학당 1시트 (시트명 = 대학명). 웹페이지의 표 구조를 그대로 세로로 쌓고,
시간대별로 (지원인원, 경쟁률) 2열 쌍을 오른쪽으로 덧붙이는 '와이드' 양식.

     A            B          C        D        E       F        G      ...  L      M
 1  전체 경쟁률 현황              [09월10일20시]     [09월11일20시]        ... [최종]      ← 노란색, 2열 병합
 2                               대학의 마감일에는 10시, 14/15시, 최종해주시면 됩니다.
 3  구분                  총모집인원  지원인원  경쟁률   지원인원  경쟁률   ...
 4  총계                   2174     4556   2.10 : 1  17229  7.93 : 1  ...
 5  학생부교과전형 (추천형) 경쟁률 현황                                          ← 표 제목행
 6  대학        모집단위    모집인원  지원인원  경쟁률   지원인원  경쟁률   ...      ← 표 헤더행
 7  문과대학    국어국문학과   8        3     0.38 : 1   18    2.25 : 1  ...
 …
59  총계                   511      363    0.71 : 1  1881   3.68 : 1  ...
60  학생부종합전형 (활동우수형) 경쟁률 현황                                       ← 다음 표
 …
```

- 고정열(A~C)은 첫 수집 시점 표에서, 이후 시점은 (지원인원, 경쟁률)만 붙인다.
- 경쟁률은 `"1.50 : 1"` 문자열 그대로, 인원은 정수.
- 1행 시간 라벨 형식: `09월10일20시`, 마감일 `09월12일10시`·`09월12일15시`, 마지막은 `최종`.

## A-3. 현행 xlsb 매크로가 하는 일 (VBA 분석)

```
A실행
 ├ 다운로드실행 : 대학링크!H열 URL을 MSXML HTTP GET → 200이면 새 시트 생성(시트명=G열)
 │               → Excel Web Query(TablesOnlyFromHTML, xlEntirePage)로 페이지의 모든 <table>을 D열부터 삽입
 ├ 퀴리제거/값으로변환 : 쿼리 연결 끊고 값만 남김
 └ 다른이름으로저장 : {yyyymmdd}{hhmm}기준.xlsx (매크로 제거)
```

**한계 (= 자동화가 해결해야 할 지점)**
1. Excel Web Query는 **정적 HTML 표만** 읽음. 유웨이어플라이(`ratio.uwayapply.com`) 페이지가 JS 렌더링이면 **빈 시트**가 됨. 교대 6개교가 유웨이 → 매크로로는 수집 불가할 가능성 높음.
2. 시트는 D열부터 시작(A~C 공백) → 취합 시 수작업으로 열을 맞춰야 함.
3. 매일 20시에 사람이 PC 앞에서 실행 버튼을 눌러야 함.
4. 취합 파일에 값 붙여넣기는 100% 수작업 → 첨부 예시(연세대) 233~318행처럼 **열 개수가 다른 표(계열 열 추가)에서 지원인원/경쟁률이 한 칸 밀리는 오류**가 실제로 발생해 있음.
5. 캡쳐(증빙) 기능 없음.

## A-4. 결론: 요구 자료 생성 가능 여부

| 산출물 | 가능 | 검증 |
|-------|-----|-----|
| ① 시간별 백데이터 시트 (매크로 산출물과 동일, 값만) | ✅ | Playwright `<table>` → 2D 배열 → openpyxl 기록. 매크로보다 정확(A열부터, JS 페이지 가능) |
| ② 페이지 캡쳐 이미지 (대학명·시간 파일명, Drive 대학별 폴더) | ✅ | Playwright fullPage 스크린샷 |
| ③ **취합 보고서 (첨부 양식과 동일 와이드 시트)** | ✅ **검증 완료** | `report_builder.py`로 연세대 예시를 5개 시간 스냅샷으로 분해→재병합 → **3,003셀 100% 일치** (경고 0건) |
| ④ 마감일 15시 톡방 탑재용 파일 | ✅ | ③을 15시 수집 직후 자동 생성 → Drive 링크 |

**추가 가치**: ③ 생성 시 표 헤더의 '지원인원'/'경쟁률' 텍스트로 열 위치를 찾으므로, 예시 파일에 실제로 있던 열 밀림 오류가 원천 차단됨.

## A-5. 확인이 필요한 사항 (사용자 결정)

| 항목 | 내용 | 기본값 |
|-----|-----|------|
| Q1 | 지시서 팀 배정: **정보분석3팀** = 경인·공주·광주·대구·서울·전주·진주·청주·춘천교대(9) + DGIST·GIST·KAIST·KENTECH·POSTECH·UNIST(6). **부산교대는 정보분석1팀, 한국교원대는 자료개발1팀** 소속. 11개교 모두 수집할지, 팀 담당 9개교만 할지 | 11개교 전부 수집하되 보고서는 9개교 우선 |
| Q2 | 수집 PC: 매일 20시에 켜져 있는 PC가 있는지 (없으면 클라우드 실행) | 로컬 Windows PC + 작업 스케줄러 |
| Q3 | '최종' 시점: 마감 직후 대학이 공식 최종 경쟁률을 올리는 시각이 제각각 → 수동 버튼으로 수집 | 수동 트리거 |
| Q4 | 보고서 파일 단위: 팀 파일 1개(대학별 시트) vs 대학별 파일 | 팀 파일 1개 + 대학별 파일 동시 생성 |

---

# PART B. 대상 대학 · 플랫폼 · 일정

## B-1. 교대 11개교 (2026-09-07 웹 확인)

| # | 약칭 | 정식명 | 팀 | 플랫폼 | 접수기간 | 수집 횟수 | 경쟁률 URL |
|---|-----|-------|---|------|--------|---------|---------|
| 1 | 경인교대 | 경인교육대학교 | 정보분석3 | 진학 | 9/7~9/11 | 7회 | `addon.jinhakapply.com/RatioV1/RatioH/Ratio{코드}.html` (2025: 20060201) |
| 2 | 부산교대 | 부산교육대학교 | 정보분석1 | 진학 | 9/7~9/11 | 7회 | 〃 (2026: 20040241) |
| 3 | 청주교대 | 청주교육대학교 | 정보분석3 | 진학 | 9/7~9/11 | 7회 | 〃 (2026: 20100291) |
| 4 | 춘천교대 | 춘천교육대학교 | 정보분석3 | 진학 | 확인 | 확인 | 코드 확인 필요 |
| 5 | 공주교대 | 공주교육대학교 | 정보분석3 | **유웨이** | **9/8**~9/11 | 6회 | `ratio.uwayapply.com/{암호경로}` |
| 6 | 광주교대 | 광주교육대학교 | 정보분석3 | **유웨이** | 9/7~9/11 | 7회 | 〃 |
| 7 | 대구교대 | 대구교육대학교 | 정보분석3 | **유웨이** | 9/7~9/11 | 7회 | 〃 |
| 8 | 서울교대 | 서울교육대학교 | 정보분석3 | **유웨이** | **9/8**~9/11 | 6회 | 〃 |
| 9 | 전주교대 | 전주교육대학교 | 정보분석3 | **유웨이** | 9/7~9/11 | 7회 | 〃 |
| 10 | 진주교대 | 진주교육대학교 | 정보분석3 | **유웨이** | 9/7~9/11 | 7회 | 〃 |
| 11 | 한국교원대 | 한국교원대학교 | 자료개발1 | 확인 | 확인 | 확인 | 확인 필요 |

- 진학 URL 코드는 **학년도마다 바뀜**. 2027학년도 코드는 오늘 접수 시작 후 `apply.jinhakapply.com` 스마트경쟁률 → 대학 클릭으로 확인.
- 유웨이 URL은 `uwayapply.com` 파워경쟁률 → 대학 클릭 시 나오는 암호화 경로를 그대로 복사.
- 유웨이 페이지는 "10분 단위 업데이트, 마감일은 12:00까지만 공개" 같은 대학별 공개 정책이 있음 → **마감일 15시 수집이 불가한 대학이 있을 수 있음** (페이지 안내문을 캡쳐로 남기면 보고 시 근거가 됨).

## B-2. 수집 스케줄 (지시서 R1·R2 반영)

| 회차 | 일시 | 라벨 | 대상 | 트리거 |
|-----|-----|-----|-----|------|
| 1 | 9/7(월) 20:00 | `09월07일20시` | 9/7 시작 대학 (공주·서울 제외) | 자동 |
| 2 | 9/8(화) 20:00 | `09월08일20시` | 전체 | 자동 |
| 3 | 9/9(수) 20:00 | `09월09일20시` | 전체 | 자동 |
| 4 | 9/10(목) 20:00 | `09월10일20시` | 전체 | 자동 |
| 5 | 9/11(금) 10:00 | `09월11일10시` | 전체 (마감일) | 자동 |
| 6 | 9/11(금) 15:00 | `09월11일15시` | 전체 → **취합보고서 생성 → 톡방 탑재** | 자동 |
| 7 | 9/11(금) 마감 후 | `최종` | 전체 | **수동 버튼** |

- 마감일이 9/11이 아닌 대학이 확인되면 `config/universities.py`의 `accept_end`만 바꾸면 스케줄이 자동 재계산됨.
- 예비: 수집 실패 시 20:10, 20:20 자동 재시도(총 3회). 그래도 실패하면 대시보드에 빨간 표시 + 카톡/이메일 알림(선택).

---

# PART C. 시스템 설계

## C-1. 왜 이 구성인가

- **수집기 = Python**: Playwright(Python)로 JS 페이지 렌더링·캡쳐, openpyxl로 한글 엑셀 서식(병합·색·열너비) 정밀 제어. 취합 보고서 참조 구현(`report_builder.py`)이 이미 Python으로 검증됨 → Antigravity가 그대로 확장.
- **저장 = Firestore**: 시간별 스냅샷을 구조화 저장, 대시보드가 실시간 구독.
- **파일 = Google Drive**: 캡쳐 png, 백데이터 xlsx, 취합 보고서 xlsx를 대학별 폴더에. 팀 공유·톡방 링크 탑재 용이.
- **대시보드 = React**: 현황 확인·수동 실행·오류 확인. 수집 로직은 넣지 않음(브라우저는 타 도메인 스크래핑 불가).
- **실행 = Windows 작업 스케줄러**(기본) 또는 GitHub Actions cron(대안, PC 꺼져도 실행됨. 단 Drive/Firebase 키를 Secrets에 등록).

## C-2. 구성도

```
┌──────────────────────────── 수집기 (Python CLI: collector/) ────────────────────────────┐
│  main.py --label 09월07일20시 [--univ 경인교대] [--final]                                │
│                                                                                          │
│   config/universities.py ──► for 각 대학 (병렬 3개, 대학 간 2초 간격)                    │
│        │                        ├ fetch_page()   Playwright 접속·networkidle 대기         │
│        │                        ├ extract_tables()  모든 <table> → Table[] (플랫폼 파서)  │
│        │                        ├ screenshot()   fullPage png                            │
│        │                        ├ save_backdata_xlsx()  값만, 시트명=라벨                 │
│        │                        ├ firestore.save_snapshot()                              │
│        │                        └ drive.upload(png, xlsx) → 대학 폴더                     │
│        └── 전체 완료 후 (15시 회차·--final·--report) ──► build_report()                 │
│                                   Firestore 스냅샷 전부 읽기 → 취합 xlsx → Drive 루트     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
          │                         │                                │
          ▼                         ▼                                ▼
   Firebase Firestore          Google Drive                    React 대시보드 (web/)
   교대경쟁률/{대학}/snapshots  2027_수시_경쟁률_캡쳐/{대학}/    현황·추이·오류·수동실행
```

## C-3. 디렉터리

```
gyodae-ratio/
├── collector/                       ← Python 3.11
│   ├── main.py                      ← CLI 진입점 (argparse)
│   ├── config/
│   │   ├── universities.py          ← 11개교 메타 (플랫폼·URL·접수기간·팀·Drive 폴더ID)
│   │   └── schedule.py              ← 접수기간 → 회차 자동 생성 (R1·R2 규칙)
│   ├── scraper/
│   │   ├── browser.py               ← Playwright 컨텍스트 (ko-KR, 1920×1080, UA)
│   │   ├── parsers/
│   │   │   ├── base.py              ← Table/Snapshot dataclass, extract_all_tables()
│   │   │   ├── jinhakapply.py       ← 진학 파서
│   │   │   └── uwayapply.py         ← 유웨이 파서
│   │   └── capture.py               ← 스크린샷
│   ├── storage/
│   │   ├── firestore_repo.py
│   │   ├── drive_repo.py            ← 폴더 생성/조회, 업로드, 공유링크
│   │   └── backdata_xlsx.py         ← 시간별 백데이터 시트
│   ├── report/
│   │   └── report_builder.py        ← ★ 취합 보고서 (검증된 참조 구현)
│   ├── tests/
│   │   ├── fixtures/                ← 실제 HTML 저장본 (Phase 1에서 채움)
│   │   ├── test_parsers.py
│   │   └── test_report_roundtrip.py ← 연세대 예시 라운드트립 (3,003셀 일치)
│   ├── requirements.txt
│   └── .env                         ← 키 파일 경로, Drive 루트 폴더 ID
├── web/                             ← Vite + React + TS 대시보드
│   └── src/ (pages: Dashboard, University, Captures, Manual, Logs)
├── scripts/
│   ├── register_tasks.ps1           ← Windows 작업 스케줄러 등록
│   └── run_collect.bat
└── README.md
```

## C-4. 데이터 모델 (Firestore)

```
교대경쟁률 (collection)
 └ {대학약칭} (doc)  { fullName, region, team, platform, ratioUrl, acceptStart, acceptEnd, driveFolderId }
    └ snapshots (subcollection)
       └ {yyyyMMdd_HHmm} (doc)
          label: "09월07일20시"
          capturedAt: Timestamp (KST)
          isFinal: false
          status: "ok" | "partial" | "error"
          errorMessage: null
          screenshot: { fileId, webViewLink, fileName }
          backdata:   { fileId, webViewLink, fileName }
          tables: [                       ← 웹 표를 그대로 (파서 출력)
            { title: null,  rows: [["구분","총모집인원","지원인원","경쟁률"],["총계","30","45","1.50 : 1"]] },
            { title: "학생부교과전형 경쟁률 현황", rows: [[...header],[...],...] }
          ]
          summary: { mojip: 30, jiwon: 45, ratio: "1.50 : 1" }   ← 대시보드 카드용
 
수집로그 (collection)
 └ {runId} { label, startedAt, finishedAt, results: { 경인교대: "ok", 공주교대: "skip(접수전)", ... } }
```

- `tables.rows`는 **문자열 그대로** 저장(가공 금지). 숫자 변환은 보고서 생성 시에만.
- 문서 1개 ≤ 1MB 제한: 교대 표는 수십 행이라 문제없음. 만약을 위해 200행 초과 시 `tables`를 Storage JSON으로 분리하는 폴백 옵션.

## C-5. 파서 규격

### 공통 (`parsers/base.py`)

```python
@dataclass
class Table:
    title: str | None      # 표 바로 위 제목 텍스트 (예: "학생부교과전형 경쟁률 현황")
    rows: list[list[str]]  # 첫 행 = 헤더. 셀 텍스트 trim, 줄바꿈→공백, 전각공백 제거

@dataclass
class Snapshot:
    label: str
    tables: list[Table]

def extract_all_tables(page) -> list[Table]:
    """페이지 내 모든 <table>을 문서 순서대로. 제목은 table 직전 형제요소(h3/h4/p/div.caption 등) 또는 <caption>."""
```

- `rowspan`/`colspan` 처리: 병합된 셀은 **좌상단에만 값, 나머지는 ""**로 채워 직사각형 2D 배열을 보장한다 (연세대 예시에서 '대학' 열이 첫 행에만 있고 이후 빈칸인 것과 동일).
- 숫자 셀의 콤마(`1,234`)는 제거하지 않고 원문 유지 → 보고서 단계에서 int 변환.

### 진학 (`parsers/jinhakapply.py`)
- 정적 HTML. `page.goto(url, wait_until="domcontentloaded")`면 충분.
- 표 제목은 표 위 `<h3>/<p class="tit">` 계열 → 없으면 None.
- 경쟁률 셀 형식 `"1.50 : 1"` (공백 포함) 그대로.

### 유웨이 (`parsers/uwayapply.py`) — **Phase 1에서 실물 확인 후 확정**
- `wait_until="networkidle"` + `page.wait_for_selector("table")` (JS 렌더링 대비, timeout 20s).
- 전형이 탭/아코디언으로 나뉘어 있으면 모든 탭을 순회하며 클릭 후 표 수집.
- "경쟁률은 N분 단위 업데이트 / 마감일 12:00까지 공개" 같은 **안내문 텍스트도 `notice` 필드로 저장**.

### 파서 검증 규칙 (`tests/test_parsers.py`)
1. 표 ≥ 1개, 각 표 헤더에 `지원인원`·`경쟁률` 존재
2. 모든 행 길이 = 헤더 길이 (직사각형)
3. 경쟁률 셀 정규식 `^\d+(\.\d+)?\s*:\s*1$` 또는 빈칸
4. 총계 행의 지원인원 = 하위 행 합 (±0, 불일치 시 경고만)

## C-6. 캡쳐 (`scraper/capture.py`)

- viewport 1920×1080, `full_page=True`, PNG.
- 파일명 `{대학약칭}_{yyyyMMdd_HHmm}.png` (예 `경인교대_20260907_2000.png`). `최종`은 `{대학약칭}_최종_{yyyyMMdd_HHmm}.png`.
- 캡쳐 직전 `datetime.now(ZoneInfo("Asia/Seoul"))`을 라벨로 확정하고, 같은 시각을 Firestore·xlsx·파일명에 **동일하게** 사용 (시각 불일치 방지).
- 페이지 상단에 수집 시각을 오버레이(선택): `page.evaluate`로 우상단에 "수집 2026-09-07 20:00:12 KST" 배너 삽입 후 캡쳐 → 증빙력 향상.

## C-7. 백데이터 시트 (`storage/backdata_xlsx.py`) — 현행 매크로 산출물 대체

- 파일명 `{대학약칭}_{yyyyMMdd_HHmm}.xlsx`, 시트명 = 라벨(`09월07일20시`).
- 내용: `tables`를 **A1부터** 순서대로 기록. 표 사이 1행 공백, 표 제목이 있으면 제목 행 먼저. 서식 없음(값만).
- 추가 시트 `_meta`: 대학명, URL, 수집시각, 캡쳐 파일명 (1행 요약).

## C-8. 취합 보고서 (`report/report_builder.py`) — 검증 완료

알고리즘(참조 구현 그대로):
1. 첫 스냅샷의 각 표에서 헤더의 `지원인원`, `경쟁률` 열 인덱스 탐색 → 나머지를 고정열로.
2. 각 행에 대해 `[고정열 값들] + Σ_k [지원인원_k, 경쟁률_k]`.
3. 후속 스냅샷은 **표 제목으로 매칭**(없으면 순서), 행은 인덱스로 매칭하되 고정열 값이 다르면 경고 기록.
4. 1행: `전체 경쟁률 현황` + 라벨(2열 병합, 노란색). 2행: 안내문. A~C 열너비 23/18/12, 나머지 11. `D4` 틀고정.
5. 경고는 `_경고` 시트에 `[표, 행, 라벨, 메시지]`로 기록 + 해당 셀 노란 채움.

출력:
- 팀 파일 `2027대입_수시모집경쟁률취합_정보분석3팀_교대_{yyyyMMdd_HHmm}.xlsx` (대학별 시트)
- 대학별 파일 `{대학약칭}_취합_{yyyyMMdd_HHmm}.xlsx`
- 둘 다 Drive 루트 `2027_수시_경쟁률_캡쳐/_취합보고서/`에 업로드하고 webViewLink를 로그·대시보드에 표시 → 톡방 탑재용.

라운드트립 테스트(`tests/test_report_roundtrip.py`): 첨부 연세대 예시 1~231행을 5개 스냅샷으로 분해 → 재병합 → **3,003셀 일치, 경고 0건** (2026-09-07 통과).

## C-9. Google Drive

```
📁 2027_수시_경쟁률_캡쳐/                       ← .env GDRIVE_ROOT_FOLDER_ID
  ├── 📁 _취합보고서/
  │     ├── 2027대입_수시모집경쟁률취합_정보분석3팀_교대_20260911_1500.xlsx
  │     └── 경인교대_취합_20260911_1500.xlsx …
  ├── 📁 경인교대/
  │     ├── 경인교대_20260907_2000.png
  │     ├── 경인교대_20260907_2000.xlsx
  │     ├── 경인교대_20260908_2000.png
  │     └── …
  ├── 📁 공주교대/ … (11개)
```

- 인증: **OAuth 사용자 인증**(개인 Drive, 최초 1회 브라우저 로그인 → `token.json`) 권장. 서비스계정은 개인 Drive 폴더에 쓰기 권한 공유 필요.
- 폴더는 최초 실행 시 이름으로 조회, 없으면 생성 후 folderId를 Firestore 대학 문서에 캐시.
- 업로드는 `resumable` 미디어 업로드, 실패 시 3회 재시도.

## C-10. 대시보드 (web/)

| 페이지 | 내용 |
|------|-----|
| `/` 현황판 | 11개교 카드: 최신 라벨·총계 경쟁률·직전 대비 증감·상태(ok/error/접수전)·캡쳐 썸네일 |
| `/u/:id` 대학 | 시간대별 표(와이드 양식 미리보기), 전형별 경쟁률 추이 라인차트, 캡쳐 갤러리 |
| `/manual` 수동실행 | 대학 선택 + 라벨 입력(`최종` 등) → Firestore `commands` 문서 생성 → 수집기가 폴링(30초)하여 실행 |
| `/logs` 로그 | 회차별 성공/실패, 경고 목록, 보고서 Drive 링크 |

- Firestore 규칙: 읽기는 Google 로그인 사용자(팀원), 쓰기는 수집기(서비스계정)와 `commands`만 로그인 사용자.
- 브라우저에서 직접 스크래핑하지 않는다(CORS·차단).

## C-11. 실행·스케줄

`scripts/register_tasks.ps1` (Windows 작업 스케줄러):
```
schtasks /Create /TN "교대경쟁률_2000" /SC ONCE /SD 2026/09/07 /ST 20:00 /TR "C:\gyodae-ratio\scripts\run_collect.bat"   (9/7~9/10 4건)
schtasks /Create /TN "교대경쟁률_0911_1000" … /ST 10:00
schtasks /Create /TN "교대경쟁률_0911_1500" … /ST 15:00 /TR "run_collect.bat --report"
```
- `run_collect.bat`: 라벨은 `schedule.py`가 현재시각으로 자동 결정(19:45~20:30 → `MM월DD일20시`). 수동 `최종`은 대시보드 또는 `python main.py --label 최종 --final --report`.
- 대안(PC 꺼짐 대비): GitHub Actions cron(UTC 11:00 = KST 20:00)에서 동일 CLI 실행. Playwright는 `ubuntu-latest`에 브라우저 설치 필요, Firebase/Drive 키는 Secrets.

## C-12. 오류·예외 처리

| 상황 | 처리 |
|-----|-----|
| 접수 전(9/7 공주·서울) / 페이지 "준비중" | status=`skip`, 캡쳐만 저장 |
| HTTP 실패·타임아웃 | 10초 간격 3회 재시도 → error 기록, 나머지 대학 계속 |
| 표 0개 (JS 미렌더·구조 변경) | 캡쳐+HTML 원문(`.html`)을 Drive에 저장, error 표시 → 사람이 확인 |
| 지원인원이 직전보다 감소 | 경고(수시 6회 제한으로 취소 가능하므로 오류 아님) |
| 유웨이 "마감일 12시까지 공개" | 15시 수집 시 안내문 캡쳐 + `notice` 저장, 보고서 셀에 "미공개" 기입 |
| Drive 업로드 실패 | 로컬 `out/` 보관 후 다음 회차에 재업로드 |

---

# PART D. Antigravity 실행 단계 (복사해서 그대로 지시)

## Phase 0 — 준비 (오늘 19시 전 완료 목표)

```
[프롬프트]
gyodae-ratio 저장소를 만들고 C-3 디렉터리 구조를 생성해줘.
- collector/: Python 3.11, requirements.txt (playwright, openpyxl, firebase-admin, google-api-python-client, google-auth-oauthlib, python-dotenv, pytest)
- `playwright install chromium` 실행
- config/universities.py 에 B-1 표의 11개교를 dataclass 리스트로 작성. URL이 미확인인 곳은 None 두고, 접수기간·팀·플랫폼은 표대로.
- config/schedule.py: accept_start~accept_end로 회차 자동 생성 (매일 20시, 마감일 10/15/최종). 단위 테스트 포함 (5일→7회, 4일→6회, 공주교대는 9/7 회차 제외).
- report/report_builder.py 는 첨부한 참조 구현을 그대로 넣고 tests/test_report_roundtrip.py 로 연세대 예시 라운드트립 테스트를 통과시켜줘.
- Firebase 프로젝트 초기화(firestore), Google Drive OAuth 데스크톱 앱 자격증명 → .env 에 경로. README에 최초 인증 절차.
```

사람이 할 일: ① 진학 4개교 2027 코드, 유웨이 6개교 URL, 춘천·교원대 플랫폼 확인 → `universities.py` 채우기. ② Google Cloud 콘솔에서 OAuth 클라이언트 생성. ③ Firebase 프로젝트 생성.

## Phase 1 — 파서 (실물 HTML 기반)

```
[프롬프트]
scraper/browser.py, parsers/base.py 를 구현하고, 경인교대(진학)와 광주교대(유웨이) 페이지를 Playwright로 열어
1) 렌더된 HTML 전문을 tests/fixtures/{대학}_{시각}.html 로 저장
2) extract_all_tables() 결과를 JSON으로 출력해서 보여줘
그 결과를 보고 jinhakapply.py / uwayapply.py 파서를 완성하고, C-5 검증 규칙 4가지를 test_parsers.py 로 작성해 fixtures에 대해 통과시켜.
rowspan/colspan은 좌상단만 값, 나머지 "" 로 채워 직사각형을 보장할 것. 유웨이가 탭 구조면 탭을 모두 순회할 것.
```

## Phase 2 — 캡쳐·백데이터·저장

```
[프롬프트]
capture.py(C-6), backdata_xlsx.py(C-7), firestore_repo.py, drive_repo.py(C-9)를 구현하고 main.py 에서
`python main.py --label 테스트 --univ 경인교대` 로 1개 대학 end-to-end 실행이 되게 해줘.
수집 시각은 한 번만 확정해서 파일명·시트명·Firestore 모두 동일하게 사용. Drive 폴더는 없으면 생성하고 folderId 를 Firestore에 캐시.
실행 후 Drive 에 png+xlsx 가 올라가고 Firestore 문서가 생기는 것을 확인하는 체크리스트를 출력해줘.
```

## Phase 3 — 전체 수집·스케줄·보고서

```
[프롬프트]
main.py 를 11개교 병렬(동시 3개, 대학 간 2초 지연)로 확장하고 C-12 오류 처리를 넣어줘.
--report 옵션: Firestore 의 모든 스냅샷을 읽어 report_builder 로 팀 파일 + 대학별 파일을 만들고 Drive `_취합보고서/` 에 업로드, 링크를 로그에 출력.
scripts/register_tasks.ps1 로 B-2 스케줄을 Windows 작업 스케줄러에 등록하는 스크립트를 만들고, run_collect.bat 은 현재 시각으로 라벨을 자동 결정하게 해줘.
```

## Phase 4 — 대시보드

```
[프롬프트]
web/ 에 Vite+React+TS 로 C-10 의 4개 페이지를 만들어줘. Firestore 실시간 구독, Google 로그인, recharts 로 추이 차트.
/manual 에서 대학·라벨을 선택하면 Firestore commands/{id} 에 {univ, label, isFinal, createdAt, status:"pending"} 을 쓰고,
collector 에 `python main.py --watch` 모드를 추가해 30초마다 pending 명령을 실행하게 해줘.
```

## Phase 5 — 리허설 (9/8 20시 회차 전)

체크리스트
- [ ] 11개교 URL 전부 확정, `python main.py --label 리허설` 전 대학 ok
- [ ] Drive 대학 폴더 11개 + png/xlsx 확인, 파일명에 시각 포함
- [ ] `--report` 로 취합 xlsx 생성 → 첨부 양식과 육안 비교(1행 라벨, 3행 헤더, 총계, 표 제목)
- [ ] 작업 스케줄러 4+2건 등록, PC 절전 해제
- [ ] 유웨이 마감일 공개 정책 대학 목록 파악
- [ ] 9/11 15시 회차 후 보고서 링크를 톡방에 올릴 문구 템플릿 준비

---

# PART E. 위험 요소와 대응

| 위험 | 영향 | 대응 |
|-----|-----|-----|
| 유웨이 페이지가 JS/탭 구조라 첫 파서가 실패 | 6개교 수집 불가 | Phase 1에서 실물 HTML로 파서 작성. 실패 시에도 캡쳐+HTML 원문은 남기므로 수작업 복구 가능 |
| 20시에 PC가 꺼져 있음 | 회차 누락 | 절전 해제 + GitHub Actions 백업 cron |
| 진학 URL 코드가 접수 시작 후에야 생김 | 9/7 20시 회차 | 19시까지 사람이 URL 입력. 못 채우면 그 대학은 skip 로그 |
| 마감일 15시 이후 공개 중단 대학 | '최종' 열 공란 | 안내문 캡쳐로 근거 확보, 보고서에 "미공개" 표기 |
| 사이트 차단(과도 요청) | 수집 실패 | 대학당 1회 접속/회차, 2초 간격, 일반 브라우저 UA 사용 |
| 팀 배정 불일치(부산교대·교원대) | 중복 보고 | Q1 결정 후 보고서 대상 플래그 `in_report` 로 제어 |

---

# 부록. 참조 구현 파일

- `report_builder.py` — 취합 보고서 생성기 + 라운드트립 테스트 (동봉)
- `취합_라운드트립_테스트.xlsx` — 위 스크립트가 예시로부터 재생성한 결과 (첨부 양식과 동일)
