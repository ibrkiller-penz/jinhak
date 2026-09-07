import React, { useEffect, useState } from 'react';
import type { ReportItem, RunLog } from '../types';
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);

  const fetchData = () => {
    Promise.all([
      fetch('/api/reports').then((r) => r.json()),
      fetch('/api/logs').then((r) => r.json()),
    ])
      .then(([rep, lg]) => {
        setReports(rep || []);
        setLogs(lg || []);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-md">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            취합 보고서 (통합 엑셀) & 수집 실행 이력
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            수집된 대학별 스냅샷 데이터를 기반으로 생성된 와이드 보고서 엑셀 파일을 다운로드하거나 회차별 실행 로그를 확인합니다.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* 1. Generated Reports List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          생성된 취합 보고서 목록 ({reports.length}개)
        </h4>

        {reports.length === 0 ? (
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 text-center text-xs text-slate-400">
            아직 생성된 통합 취합 보고서가 없습니다. '수동 실행' 탭에서 보고서 생성을 포함하여 수집을 실행해 보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((r, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 hover:border-slate-600 shadow-md flex items-center justify-between gap-4 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate" title={r.fileName}>
                      {r.fileName}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>{r.createdAt.replace('T', ' ').slice(0, 16)}</span>
                      <span>•</span>
                      <span>{formatBytes(r.sizeBytes)}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={r.downloadUrl}
                  download
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  다운로드
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Run Logs Table */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          수집 실행 이력 ({logs.length}회)
        </h4>

        {logs.length === 0 ? (
          <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 text-center text-xs text-slate-400">
            수집 실행 이력이 없습니다.
          </div>
        ) : (
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-lg">
            <table className="w-full text-xs text-left text-slate-200 divide-y divide-slate-700">
              <thead className="bg-slate-900 text-slate-400 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">실행 ID / 라벨</th>
                  <th className="px-4 py-3">수집 시각 (KST)</th>
                  <th className="px-4 py-3">대상 대학</th>
                  <th className="px-4 py-3">수집 결과</th>
                  <th className="px-4 py-3">소요 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40 font-mono">
                {logs.map((lg, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/60 transition">
                    <td className="px-4 py-3 font-bold text-white">
                      {lg.label || lg.runId}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {lg.startedAt?.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      총 {lg.total}개교
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">
                          성공 {lg.ok}
                        </span>
                        {lg.skip > 0 && (
                          <span className="text-amber-400">대기 {lg.skip}</span>
                        )}
                        {lg.error > 0 && (
                          <span className="text-rose-400 font-bold">
                            실패 {lg.error}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> 완료
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
