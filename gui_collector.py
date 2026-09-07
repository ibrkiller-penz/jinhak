"""
gui_collector.py — 2027 수시 교대 경쟁률 자동 수집기 데스크톱 GUI 프로그램

실행: python gui_collector.py
"""
import os
import sys
import asyncio
import threading
import subprocess
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

# 프로젝트 루트 경로 설정
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from collector.config.universities import UNIVERSITIES, in_scope, by_key
from collector.config.schedule import generate_rounds, get_current_label
from collector.main import run_collector
from collector.storage.firestore_repo import FirestoreRepo
from collector.storage.drive_repo import DriveRepo

KST = ZoneInfo("Asia/Seoul")


class RatioCollectorGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("2027 수시 교대 경쟁률 자동 수집기 (Gyodae Ratio Collector)")
        self.root.geometry("1020x760")
        self.root.minsize(880, 640)

        # 상태 관리
        self.is_running = False
        self.scheduler_active = False
        self.firestore_repo = FirestoreRepo()
        self.drive_repo = DriveRepo()
        self.univ_vars = {}

        self._setup_style()
        self._build_ui()
        self._start_clock_thread()
        self._refresh_univ_table()

    def _setup_style(self):
        self.root.configure(bg="#0f172a")
        style = ttk.Style()
        style.theme_use("clam")

        # 기본 색상 구성
        style.configure("TFrame", background="#0f172a")
        style.configure("Card.TFrame", background="#1e293b", relief="flat")
        style.configure("TLabel", background="#0f172a", foreground="#f8fafc", font=("Segoe UI", 9))
        style.configure("Header.TLabel", background="#0f172a", foreground="#ffffff", font=("Segoe UI", 14, "bold"))
        style.configure("SubHeader.TLabel", background="#0f172a", foreground="#94a3b8", font=("Segoe UI", 9))
        style.configure("Card.TLabel", background="#1e293b", foreground="#e2e8f0", font=("Segoe UI", 9))

        # 트리뷰(테이블) 스타일
        style.configure("Treeview",
                        background="#1e293b",
                        foreground="#f8fafc",
                        fieldbackground="#1e293b",
                        rowheight=28,
                        font=("Segoe UI", 9))
        style.configure("Treeview.Heading",
                        background="#334155",
                        foreground="#ffffff",
                        font=("Segoe UI", 9, "bold"),
                        relief="flat")
        style.map("Treeview", background=[("selected", "#2563eb")], foreground=[("selected", "#ffffff")])
        style.map("Treeview.Heading", background=[("active", "#475569")])

        # 프로그레스바 스타일
        style.configure("TProgressbar", troughcolor="#1e293b", background="#3b82f6", thickness=6)

    def _build_ui(self):
        # 최상단 메인 컨테이너
        main_box = ttk.Frame(self.root, padding="16")
        main_box.pack(fill=tk.BOTH, expand=True)

        # 1. 상단 헤더 영역
        header_frame = ttk.Frame(main_box)
        header_frame.pack(fill=tk.X, pady=(0, 12))

        title_box = ttk.Frame(header_frame)
        title_box.pack(side=tk.LEFT)
        ttk.Label(title_box, text="🎓 2027 수시 교대 경쟁률 자동 수집기", style="Header.TLabel").pack(anchor="w")
        ttk.Label(title_box, text="Playwright 실시간 크롤링 • 증빙 캡쳐 • 백데이터 XLSX • 팀 통합 와이드 보고서 생성", style="SubHeader.TLabel").pack(anchor="w")

        # 우측 시계 및 스케줄러 상태
        right_status_box = ttk.Frame(header_frame)
        right_status_box.pack(side=tk.RIGHT)
        self.time_label = ttk.Label(right_status_box, text="현재 시각: 계산 중...", font=("Segoe UI", 10, "bold"), foreground="#38bdf8")
        self.time_label.pack(anchor="e")

        self.sched_status_label = ttk.Label(right_status_box, text="⏰ 자동 스케줄러: 비활성", font=("Segoe UI", 8), foreground="#94a3b8")
        self.sched_status_label.pack(anchor="e")

        # 2. 제어 패널 (컨트롤 카드)
        ctrl_card = ttk.Frame(main_box, style="Card.TFrame", padding="14")
        ctrl_card.pack(fill=tk.X, pady=(0, 12))

        # 1행: 회차 라벨 입력 및 프리셋
        row1 = ttk.Frame(ctrl_card, style="Card.TFrame")
        row1.pack(fill=tk.X, pady=(0, 8))

        ttk.Label(row1, text="수집 회차 라벨:", style="Card.TLabel", font=("Segoe UI", 9, "bold")).pack(side=tk.LEFT, padx=(0, 8))
        self.label_var = tk.StringVar(value=get_current_label())
        self.label_entry = tk.Entry(row1, textvariable=self.label_var, font=("Segoe UI", 10), width=16, bg="#0f172a", fg="#ffffff", insertbackground="#ffffff", relief="flat")
        self.label_entry.pack(side=tk.LEFT, padx=(0, 10))

        # 프리셋 버튼들
        for preset in ["09월07일20시", "09월11일10시", "09월11일15시", "최종"]:
            btn = tk.Button(row1, text=preset, command=lambda p=preset: self._set_label_preset(p),
                            bg="#334155", fg="#e2e8f0", activebackground="#475569", activeforeground="#ffffff",
                            relief="flat", font=("Segoe UI", 8), padx=8, pady=2, cursor="hand2")
            btn.pack(side=tk.LEFT, padx=2)

        # 옵션 체크박스
        self.report_var = tk.BooleanVar(value=True)
        self.final_var = tk.BooleanVar(value=False)
        self.auto_sched_var = tk.BooleanVar(value=False)

        opt_box = ttk.Frame(row1, style="Card.TFrame")
        opt_box.pack(side=tk.RIGHT)

        cb_report = tk.Checkbutton(opt_box, text="통합 보고서 생성 (--report)", variable=self.report_var,
                                   bg="#1e293b", fg="#cbd5e1", selectcolor="#0f172a", activebackground="#1e293b", activeforeground="#ffffff", font=("Segoe UI", 8))
        cb_report.pack(side=tk.LEFT, padx=6)

        cb_final = tk.Checkbutton(opt_box, text="최종 마감 플래그 (--final)", variable=self.final_var,
                                  bg="#1e293b", fg="#cbd5e1", selectcolor="#0f172a", activebackground="#1e293b", activeforeground="#ffffff", font=("Segoe UI", 8))
        cb_final.pack(side=tk.LEFT, padx=6)

        # 2행: 메인 실행 버튼 및 액션
        row2 = ttk.Frame(ctrl_card, style="Card.TFrame")
        row2.pack(fill=tk.X)

        self.btn_run = tk.Button(row2, text="▶  선택 대학 즉시 수집 시작", command=self.start_collection_thread,
                                 bg="#2563eb", fg="#ffffff", activebackground="#1d4ed8", activeforeground="#ffffff",
                                 font=("Segoe UI", 10, "bold"), relief="flat", padx=18, pady=6, cursor="hand2")
        self.btn_run.pack(side=tk.LEFT, padx=(0, 8))

        self.btn_sched = tk.Button(row2, text="⏰  자동 예약 수집 모드 시작", command=self.toggle_scheduler,
                                   bg="#047857", fg="#ffffff", activebackground="#065f46", activeforeground="#ffffff",
                                   font=("Segoe UI", 9, "bold"), relief="flat", padx=14, pady=6, cursor="hand2")
        self.btn_sched.pack(side=tk.LEFT, padx=(0, 8))

        # 바로가기 버튼들
        btn_open_folder = tk.Button(row2, text="📂 결과 폴더", command=self.open_output_dir,
                                    bg="#334155", fg="#f1f5f9", activebackground="#475569", relief="flat", font=("Segoe UI", 8), padx=10, pady=5, cursor="hand2")
        btn_open_folder.pack(side=tk.RIGHT, padx=3)

        btn_open_excel = tk.Button(row2, text="📊 최신 엑셀 보고서 열기", command=self.open_latest_report,
                                   bg="#15803d", fg="#ffffff", activebackground="#166534", relief="flat", font=("Segoe UI", 8, "bold"), padx=10, pady=5, cursor="hand2")
        btn_open_excel.pack(side=tk.RIGHT, padx=3)

        btn_open_web = tk.Button(row2, text="🌐 웹 대시보드", command=self.open_web_dashboard,
                                 bg="#4f46e5", fg="#ffffff", activebackground="#4338ca", relief="flat", font=("Segoe UI", 8), padx=10, pady=5, cursor="hand2")
        btn_open_web.pack(side=tk.RIGHT, padx=3)

        # 3. 중간 영역: 대학 목록 테이블 (선택 가능)
        mid_box = ttk.Frame(main_box)
        mid_box.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        # 테이블 상단 바 (선택 필터)
        tbl_header = ttk.Frame(mid_box)
        tbl_header.pack(fill=tk.X, pady=(0, 4))

        ttk.Label(tbl_header, text="🏛️ 대상 대학 및 실시간 수집 현황", font=("Segoe UI", 10, "bold"), foreground="#e2e8f0").pack(side=tk.LEFT)

        filter_btn_box = ttk.Frame(tbl_header)
        filter_btn_box.pack(side=tk.RIGHT)

        tk.Button(filter_btn_box, text="교대 9개교 선택", command=self.select_gyodae_only, bg="#1e293b", fg="#38bdf8", relief="flat", font=("Segoe UI", 8), cursor="hand2").pack(side=tk.LEFT, padx=3)
        tk.Button(filter_btn_box, text="전체 선택", command=self.select_all_univs, bg="#1e293b", fg="#94a3b8", relief="flat", font=("Segoe UI", 8), cursor="hand2").pack(side=tk.LEFT, padx=3)
        tk.Button(filter_btn_box, text="선택 해제", command=self.deselect_all_univs, bg="#1e293b", fg="#94a3b8", relief="flat", font=("Segoe UI", 8), cursor="hand2").pack(side=tk.LEFT, padx=3)
        tk.Button(filter_btn_box, text="새로고침", command=self._refresh_univ_table, bg="#1e293b", fg="#94a3b8", relief="flat", font=("Segoe UI", 8), cursor="hand2").pack(side=tk.LEFT, padx=3)

        # Treeview 생성
        columns = ("select", "univ", "platform", "status", "ratio", "applicants", "last_label", "notice")
        self.tree = ttk.Treeview(mid_box, columns=columns, show="headings", selectmode="extended")
        self.tree.heading("select", text="선택")
        self.tree.heading("univ", text="대학명")
        self.tree.heading("platform", text="플랫폼")
        self.tree.heading("status", text="상태")
        self.tree.heading("ratio", text="경쟁률")
        self.tree.heading("applicants", text="지원인원 / 모집")
        self.tree.heading("last_label", text="최신 회차")
        self.tree.heading("notice", text="비고 / 공지사항")

        self.tree.column("select", width=50, anchor="center")
        self.tree.column("univ", width=120, anchor="w")
        self.tree.column("platform", width=90, anchor="center")
        self.tree.column("status", width=80, anchor="center")
        self.tree.column("ratio", width=90, anchor="center")
        self.tree.column("applicants", width=120, anchor="center")
        self.tree.column("last_label", width=100, anchor="center")
        self.tree.column("notice", width=260, anchor="w")

        # 스크롤바
        scroll_y = ttk.Scrollbar(mid_box, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll_y.set)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)

        self.tree.bind("<Button-1>", self._on_tree_click)

        # 4. 하단 영역: 실시간 로그 콘솔 및 프로그레스바
        bottom_box = ttk.Frame(main_box)
        bottom_box.pack(fill=tk.BOTH, expand=False)

        log_header = ttk.Frame(bottom_box)
        log_header.pack(fill=tk.X, pady=(0, 2))
        ttk.Label(log_header, text="📝 실시간 수집 로그 & 진행 상태", font=("Segoe UI", 9, "bold"), foreground="#94a3b8").pack(side=tk.LEFT)

        self.progress = ttk.Progressbar(bottom_box, mode="indeterminate")
        self.progress.pack(fill=tk.X, pady=(0, 4))

        self.log_text = scrolledtext.ScrolledText(
            bottom_box,
            height=8,
            bg="#020617",
            fg="#94a3b8",
            insertbackground="#ffffff",
            font=("Consolas", 9),
            relief="flat",
            wrap=tk.WORD,
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # 로그 색상 태그 설정
        self.log_text.tag_config("info", foreground="#38bdf8")
        self.log_text.tag_config("success", foreground="#4ade80")
        self.log_text.tag_config("warning", foreground="#fbbf24")
        self.log_text.tag_config("error", foreground="#f87171")
        self.log_text.tag_config("bold", font=("Consolas", 9, "bold"))

        self.log("시스템 초기화 완료. 수집 준비 상태입니다.", "info")

    def log(self, message: str, level: str = "normal"):
        ts = datetime.now(KST).strftime("%H:%M:%S")
        line = f"[{ts}] {message}\n"
        self.log_text.insert(tk.END, line, (level,))
        self.log_text.see(tk.END)

    def _set_label_preset(self, preset: str):
        self.label_var.set(preset)
        if preset == "최종":
            self.final_var.set(True)
        else:
            self.final_var.set(False)

    def _on_tree_click(self, event):
        region = self.tree.identify("region", event.x, event.y)
        if region == "cell":
            column = self.tree.identify_column(event.x)
            if column == "#1":  # '선택' 열 클릭
                item = self.tree.identify_row(event.y)
                if item:
                    univ_key = self.tree.item(item, "values")[1]
                    curr_val = self.univ_vars.get(univ_key, True)
                    self.univ_vars[univ_key] = not curr_val
                    self._refresh_univ_table()

    def select_gyodae_only(self):
        for u in UNIVERSITIES:
            self.univ_vars[u.key] = u.in_scope
        self._refresh_univ_table()

    def select_all_univs(self):
        for u in UNIVERSITIES:
            self.univ_vars[u.key] = True
        self._refresh_univ_table()

    def deselect_all_univs(self):
        for u in UNIVERSITIES:
            self.univ_vars[u.key] = False
        self._refresh_univ_table()

    def _refresh_univ_table(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        for u in UNIVERSITIES:
            if u.key not in self.univ_vars:
                self.univ_vars[u.key] = u.in_scope

            is_selected = "☑" if self.univ_vars[u.key] else "☐"
            platform_str = "진학사" if u.platform == "jinhakapply" else "유웨이"

            # 스냅샷 조회
            snaps = self.firestore_repo.get_snapshots_for_univ(u.key)
            latest = snaps[-1] if snaps else None

            status_str = "대기"
            ratio_str = "-"
            applicant_str = "-"
            last_label = "-"
            notice_str = u.note or ""

            if latest:
                last_label = latest.label
                if latest.status == "ok":
                    status_str = "✅ 완료"
                    ratio_str = latest.summary.get("ratio", "-")
                    jiwon = latest.summary.get("jiwon", 0)
                    mojip = latest.summary.get("mojip", 0)
                    applicant_str = f"{jiwon:,} / {mojip:,}명"
                elif latest.status == "skip":
                    status_str = "⏳ 접수대기"
                else:
                    status_str = "❌ 오류"
                if latest.notice:
                    notice_str = latest.notice
            elif not u.ratio_url:
                status_str = "⏳ URL미확인"

            self.tree.insert("", tk.END, values=(
                is_selected,
                u.key,
                platform_str,
                status_str,
                ratio_str,
                applicant_str,
                last_label,
                notice_str,
            ))

    def _start_clock_thread(self):
        def clock_loop():
            while True:
                now = datetime.now(KST)
                time_str = now.strftime("%Y-%m-%d %H:%M:%S KST")
                self.root.after(0, lambda t=time_str: self.time_label.config(text=f"현재 시각: {t}"))
                time.sleep(1)

        t = threading.Thread(target=clock_loop, daemon=True)
        t.start()

    def start_collection_thread(self):
        if self.is_running:
            messagebox.showwarning("진행 중", "이미 수집 작업이 진행 중입니다.")
            return

        selected_keys = [k for k, v in self.univ_vars.items() if v]
        if not selected_keys:
            messagebox.showwarning("선택 없음", "수집할 대학을 최소 1개 이상 선택해 주세요.")
            return

        label = self.label_var.get().strip() or get_current_label()
        gen_report = self.report_var.get()
        is_final = self.final_var.get()

        self.is_running = True
        self.btn_run.config(state=tk.DISABLED, bg="#475569")
        self.progress.start(10)
        self.log(f"🚀 수집 작업 시작 (회차: {label}, 대상: {len(selected_keys)}개교)", "info")

        def run_async():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(run_collector(
                    label=label,
                    univ_keys=selected_keys,
                    generate_report=gen_report,
                    is_final=is_final,
                ))
                self.root.after(0, lambda: self.log("🎉 수집 및 취합 보고서 작성이 성공적으로 완료되었습니다!", "success"))
            except Exception as e:
                self.root.after(0, lambda err=str(e): self.log(f"❌ 수집 중 오류 발생: {err}", "error"))
            finally:
                loop.close()
                self.root.after(0, self._on_collection_finished)

        t = threading.Thread(target=run_async, daemon=True)
        t.start()

    def _on_collection_finished(self):
        self.is_running = False
        self.progress.stop()
        self.btn_run.config(state=tk.NORMAL, bg="#2563eb")
        self._refresh_univ_table()

    def toggle_scheduler(self):
        self.scheduler_active = not self.scheduler_active
        if self.scheduler_active:
            self.btn_sched.config(text="⏹️  자동 예약 수집 모드 중지", bg="#dc2626")
            self.sched_status_label.config(text="⏰ 자동 스케줄러: 작동 중 (20:00 / 10:00 / 15:00 감시)", foreground="#4ade80")
            self.log("⏰ 자동 예약 수집 스케줄러가 활성화되었습니다.", "info")
            t = threading.Thread(target=self._scheduler_loop, daemon=True)
            t.start()
        else:
            self.btn_sched.config(text="⏰  자동 예약 수집 모드 시작", bg="#047857")
            self.sched_status_label.config(text="⏰ 자동 스케줄러: 비활성", foreground="#94a3b8")
            self.log("⏰ 자동 예약 수집 스케줄러가 중지되었습니다.", "warning")

    def _scheduler_loop(self):
        last_triggered_label = ""
        while self.scheduler_active:
            now = datetime.now(KST)
            # 20:00, 10:00, 15:00 정각 ±2분 감지
            should_run = False
            current_label = get_current_label(now)

            if now.hour == 20 and now.minute == 0:
                should_run = True
            elif now.hour == 10 and now.minute == 0:
                should_run = True
            elif now.hour == 15 and now.minute == 0:
                should_run = True

            if should_run and current_label != last_triggered_label and not self.is_running:
                last_triggered_label = current_label
                self.root.after(0, lambda lbl=current_label: self._trigger_scheduled_run(lbl))

            time.sleep(30)

    def _trigger_scheduled_run(self, label: str):
        self.label_var.set(label)
        self.log(f"⏰ [스케줄러 자동 실행] 회차 {label} 수집을 시작합니다.", "info")
        self.start_collection_thread()

    def open_output_dir(self):
        out_dir = ROOT_DIR / "out"
        out_dir.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32":
            os.startfile(out_dir)
        else:
            subprocess.Popen(["xdg-open", str(out_dir)])

    def open_latest_report(self):
        report_dir = ROOT_DIR / "out" / "reports"
        if report_dir.exists():
            reports = sorted(report_dir.glob("*.xlsx"), key=os.path.getmtime, reverse=True)
            if reports:
                latest = reports[0]
                if sys.platform == "win32":
                    os.startfile(latest)
                else:
                    subprocess.Popen(["xdg-open", str(latest)])
                return
        messagebox.showinfo("알림", "생성된 취합 보고서 엑셀 파일이 없습니다. 먼저 수집을 실행해 주세요.")

    def open_web_dashboard(self):
        import webbrowser
        # 서버가 안 켜져 있으면 백그라운드로 실행
        threading.Thread(target=self._ensure_server_running, daemon=True).start()
        webbrowser.open("http://localhost:8000")

    def _ensure_server_running(self):
        try:
            import uvicorn
            from collector.server import app
            uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
        except Exception:
            pass


def main():
    root = tk.Tk()
    app = RatioCollectorGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
