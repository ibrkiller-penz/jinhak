import React, { useEffect, useState } from 'react';
import type { UniversityDetail, SnapshotDetail } from '../types';
import { db, doc, getDoc, collection, getDocs } from '../firebase';
import {
  ArrowLeft,
  ExternalLink,
  Camera,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Calendar,
  AlertCircle,
  Table as TableIcon,
  BarChart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface UniversityDetailPageProps {
  univKey: string;
  onBack: () => void;
  onPreviewCapture: (url: string, title: string) => void;
}

const DEFAULT_ROUNDS_GYODAE = [
  { label: '09월07일20시', scheduledAt: '2026-09-07T20:05:00+09:00', isFinal: false },
  { label: '09월08일20시', scheduledAt: '2026-09-08T20:05:00+09:00', isFinal: false },
  { label: '09월09일20시', scheduledAt: '2026-09-09T20:05:00+09:00', isFinal: false },
  { label: '09월10일20시', scheduledAt: '2026-09-10T20:05:00+09:00', isFinal: false },
  { label: '09월11일10시', scheduledAt: '2026-09-11T10:00:00+09:00', isFinal: false },
  { label: '09월11일15시', scheduledAt: '2026-09-11T15:00:00+09:00', isFinal: false },
  { label: '최종', scheduledAt: '2026-09-11T18:00:00+09:00', isFinal: true },
];

const DEFAULT_ROUNDS_TECH = [
  { label: '09월07일20시', scheduledAt: '2026-09-07T20:05:00+09:00', isFinal: false },
  { label: '09월08일20시', scheduledAt: '2026-09-08T20:05:00+09:00', isFinal: false },
  { label: '09월09일20시', scheduledAt: '2026-09-09T20:05:00+09:00', isFinal: false },
  { label: '09월10일20시', scheduledAt: '2026-09-10T20:05:00+09:00', isFinal: false },
  { label: '최종', scheduledAt: '2026-09-11T18:00:00+09:00', isFinal: true },
];

export const UniversityDetailPage: React.FC<UniversityDetailPageProps> = ({
  univKey,
  onBack,
  onPreviewCapture,
}) => {
  const [data, setData] = useState<UniversityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'captures'>('table');
  const [selectedSnapIndex, setSelectedSnapIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setSelectedSnapIndex(null);

    async function loadData() {
      // 1. Local FastAPI Try
      try {
        const res = await fetch(`/api/snapshots/${encodeURIComponent(univKey)}`);
        const ctype = res.headers.get('content-type') || '';
        if (res.ok && ctype.includes('application/json')) {
          const d = await res.json();
          if (isMounted && d && d.university) {
            setData(d);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to Firestore
      }

      // 2. Cloud Firestore Direct Fetch
      try {
        const docRef = doc(db, '교대경쟁률', univKey);
        const docSnap = await getDoc(docRef);
        const meta = docSnap.exists() ? docSnap.data() : null;

        const snapColl = collection(db, '교대경쟁률', univKey, 'snapshots');
        const snapDocs = await getDocs(snapColl);

        const snapshotsList: SnapshotDetail[] = [];
        snapDocs.forEach((sDoc) => {
          const s = sDoc.data();
          let parsedTables = s.tables || [];
          if (s.tablesJson) {
            try {
              parsedTables = JSON.parse(s.tablesJson);
            } catch (e) {
              console.error('tablesJson parse error:', e);
            }
          }
          snapshotsList.push({
            label: s.label || '09월07일20시',
            capturedAt: s.capturedAt || '',
            status: s.status || 'ok',
            notice: s.notice || null,
            summary: s.summary || {},
            captureUrl: s.screenshot?.webViewLink || s.captureUrl || null,
            xlsxUrl: s.backdata?.webViewLink || s.xlsxUrl || null,
            tables: parsedTables,
          });
        });

        // 시간순 정렬
        snapshotsList.sort((a, b) => (a.capturedAt > b.capturedAt ? 1 : -1));

        // If no snapshots but lastSnapshot exists
        if (snapshotsList.length === 0 && meta?.lastSnapshot) {
          snapshotsList.push({
            label: meta.lastSnapshot.label || '09월07일20시',
            capturedAt: meta.lastSnapshot.capturedAt || new Date().toISOString(),
            status: meta.lastSnapshot.status || 'ok',
            notice: meta.lastSnapshot.notice || null,
            summary: meta.lastSnapshot.summary || {
              ratio: meta.lastSnapshot.ratio || '-',
              mojip: meta.lastSnapshot.mojip || 0,
              jiwon: meta.lastSnapshot.jiwon || 0,
            },
            tables: [],
          });
        }

        const isTechUniv = ['DGIST', 'GIST', 'KAIST', 'KENTECH', 'POSTECH', 'UNIST'].includes(univKey);

        const detail: UniversityDetail = {
          university: {
            key: univKey,
            fullName: meta?.fullName || univKey,
            platform: meta?.platform || 'uwayapply',
            ratioUrl: meta?.ratioUrl || null,
            acceptStart: meta?.acceptStart || null,
            acceptEnd: meta?.acceptEnd || null,
            rounds: meta?.rounds || (isTechUniv ? DEFAULT_ROUNDS_TECH : DEFAULT_ROUNDS_GYODAE),
          },
          snapshots: snapshotsList,
        };

        if (isMounted) {
          setData(detail);
          setLoading(false);
        }
      } catch (err) {
        console.error('Firestore snapshot loading error:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [univKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <Clock className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  if (!data || !data.university) {
    return (
      <div className="bg-slate-800 p-8 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-white font-semibold">대학 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  const { university: univ, snapshots } = data;
  const activeSnapIndex =
    selectedSnapIndex !== null && selectedSnapIndex >= 0 && selectedSnapIndex < snapshots.length
      ? selectedSnapIndex
      : snapshots.length - 1;

  // 현재 선택된 스냅샷 (기본값: 최신 스냅샷)
  const currentSnapshot =
    snapshots.length > 0 && activeSnapIndex >= 0 && activeSnapIndex < snapshots.length
      ? snapshots[activeSnapIndex]
      : null;

  // 차트 데이터 변환
  const chartData = snapshots.map((s) => {
    let rVal = 0;
    if (s.summary?.ratio) {
      const match = s.summary.ratio.match(/([\d.]+)/);
      if (match) rVal = parseFloat(match[1]);
    }
    return {
      label: s.label,
      capturedAt: s.capturedAt,
      ratio: rVal,
      jiwon: s.summary?.jiwon || 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">{univ.key}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {univ.platform === 'jinhakapply' ? '진학사' : '유웨이어플라이'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{univ.fullName}</p>
          </div>
        </div>

        {/* Schedule & Link Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {univ.ratioUrl && (
            <a
              href={univ.ratioUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-xl border border-slate-600 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              실시간 사이트
            </a>
          )}
          {currentSnapshot && currentSnapshot.xlsxUrl && (
            <a
              href={currentSnapshot.xlsxUrl}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium rounded-xl border border-emerald-500/30 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {currentSnapshot.label} 백데이터 다운로드
            </a>
          )}
        </div>
      </div>

      {/* Schedule Rounds Progress Milestone */}
      <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            수집 일정 진행 현황 (회차를 클릭하면 해당 시점의 데이터로 전환됩니다)
          </h4>
          <span className="text-[11px] text-blue-400 font-medium">
            총 {snapshots.length}개 회차 수집 완료
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {univ.rounds.map((r, idx) => {
            // 1. Exact or intelligent date matching
            let snapIdx = snapshots.findIndex((s) => s.label === r.label);
            if (snapIdx === -1) {
              const dateMatch = r.label.match(/(\d+월\d+일)/);
              if (dateMatch) {
                const datePrefix = dateMatch[1];
                snapIdx = snapshots.findIndex(
                  (s) => s.label.startsWith(datePrefix) || s.capturedAt.includes(datePrefix.replace('월', '-').replace('일', ''))
                );
              }
            }

            const matchedSnap = snapIdx !== -1 ? snapshots[snapIdx] : null;
            const isCompleted = !!matchedSnap;
            const isSelected = matchedSnap && activeSnapIndex === snapIdx;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (matchedSnap) setSelectedSnapIndex(snapIdx);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCompleted ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
                } ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                    : isCompleted
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-xs font-bold truncate">
                  {matchedSnap ? matchedSnap.label : r.label}
                </div>
                <div className={`text-[10px] mt-0.5 font-mono ${isSelected ? 'text-blue-100 font-bold' : isCompleted ? 'text-emerald-400' : 'opacity-70'}`}>
                  {isCompleted
                    ? `${matchedSnap.summary?.ratio || '수집완료'}`
                    : '예정'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'table'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          와이드 시트 표
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'chart'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart className="w-4 h-4" />
          경쟁률 추이 차트
        </button>
        <button
          onClick={() => setActiveTab('captures')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'captures'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          증빙 캡쳐 갤러리 ({snapshots.length})
        </button>
      </div>

      {/* Tab 1: Wide Table Preview */}
      {activeTab === 'table' && (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 overflow-hidden shadow-lg space-y-4">
          {/* Snapshot selector header */}
          {snapshots.length > 0 && currentSnapshot && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">조회 회차:</span>
                <select
                  value={activeSnapIndex}
                  onChange={(e) => setSelectedSnapIndex(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  {snapshots.map((s, sIdx) => (
                    <option key={sIdx} value={sIdx}>
                      {s.label} ({s.summary?.ratio || '-'}) - {s.capturedAt.replace('T', ' ').slice(0, 16)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  모집: <strong className="text-white font-mono">{currentSnapshot.summary?.mojip || 0}명</strong>
                </span>
                <span className="text-slate-400">
                  지원: <strong className="text-emerald-400 font-mono">{currentSnapshot.summary?.jiwon || 0}명</strong>
                </span>
                <span className="text-slate-400">
                  총 경쟁률: <strong className="text-blue-400 font-mono font-bold text-sm">{currentSnapshot.summary?.ratio || '-'}</strong>
                </span>
              </div>
            </div>
          )}

          {!currentSnapshot || !currentSnapshot.tables || currentSnapshot.tables.length === 0 ? (
            <p className="text-center py-12 text-sm text-slate-400">
              아직 수집된 스냅샷 데이터가 없습니다. 상단의 '수동 실행' 탭에서 첫 회차 수집을 실행해 보세요.
            </p>
          ) : (
            <div className="space-y-6">
              {currentSnapshot.tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2">
                  {table.title && (
                    <h5 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      {table.title}
                    </h5>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs text-left text-slate-200 divide-y divide-slate-700">
                      <thead className="bg-slate-900 text-slate-300 font-semibold uppercase">
                        <tr>
                          {table.rows[0]?.map((col, cIdx) => (
                            <th key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap bg-slate-900/90">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/40 font-mono">
                        {table.rows.slice(1).map((row, rIdx) => {
                          const isTotalRow =
                            row[0]?.includes('총계') || row[0]?.includes('합계');
                          return (
                            <tr
                              key={rIdx}
                              className={`hover:bg-slate-800/60 transition ${
                                isTotalRow
                                  ? 'bg-blue-500/10 font-bold text-blue-200'
                                  : ''
                              }`}
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="px-3.5 py-2 whitespace-nowrap text-slate-300"
                                >
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recharts Trend Chart */}
      {activeTab === 'chart' && (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 shadow-lg space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            회차별 총 경쟁률 추이
          </h4>
          {chartData.length <= 1 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              회차별 추이 분석을 위해 2회 이상의 수집 스냅샷이 필요합니다. (현재 {chartData.length}회 수집됨)
            </div>
          ) : (
            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    name="경쟁률 (: 1)"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: '#38bdf8', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Capture Gallery */}
      {activeTab === 'captures' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((s, idx) => (
            <div
              key={idx}
              className="bg-slate-800/80 rounded-2xl border border-slate-700 overflow-hidden shadow group"
            >
              <div
                className="aspect-video bg-slate-950 relative overflow-hidden cursor-pointer"
                onClick={() =>
                  s.captureUrl && onPreviewCapture(s.captureUrl, `${univ.key} [${s.label}]`)
                }
              >
                {s.captureUrl ? (
                  <img
                    src={s.captureUrl}
                    alt={s.label}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                    캡쳐 없음
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white border border-slate-700">
                  {s.label}
                </div>
              </div>
              <div className="p-3 flex items-center justify-between text-xs text-slate-400">
                <span>{s.capturedAt.replace('T', ' ').slice(0, 16)}</span>
                {s.captureUrl && (
                  <button
                    onClick={() => onPreviewCapture(s.captureUrl!, `${univ.key} [${s.label}]`)}
                    className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    크게보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
