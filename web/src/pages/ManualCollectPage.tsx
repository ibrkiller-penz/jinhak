import React, { useState } from 'react';
import type { University } from '../types';
import {
  Play,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';

interface ManualCollectPageProps {
  universities: University[];
  defaultLabel: string;
  isCollecting: boolean;
  onRefresh: () => void;
}

export const ManualCollectPage: React.FC<ManualCollectPageProps> = ({
  universities,
  defaultLabel,
  isCollecting,
  onRefresh,
}) => {
  const [label, setLabel] = useState(defaultLabel);
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>(
    universities.filter((u) => u.inScope).map((u) => u.key)
  );
  const [isFinal, setIsFinal] = useState(false);
  const [generateReport, setGenerateReport] = useState(true);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const toggleUniv = (key: string) => {
    setSelectedUnivs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllGyodae = () => {
    setSelectedUnivs(universities.filter((u) => u.inScope).map((u) => u.key));
  };

  const selectAll = () => {
    setSelectedUnivs(universities.map((u) => u.key));
  };

  const clearSelection = () => {
    setSelectedUnivs([]);
  };

  const handleRun = async () => {
    if (selectedUnivs.length === 0) {
      alert('수집할 대학을 최소 1개 이상 선택해 주세요.');
      return;
    }

    setRunMessage('수집 작업을 요청하는 중...');
    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim() || defaultLabel,
          univs: selectedUnivs,
          final: isFinal,
          report: generateReport,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Firebase Cloud Hosting 모드 -> 안내 및 깃허브 액션 링크 제공
        setRunMessage(
          `☁️ 현재 웹앱은 '클라우드 정적 호스팅' 상태입니다. 아래의 [🚀 깃허브 클라우드 즉시 실행] 버튼을 누르시면 클라우드 서버에서 즉시 원격 수집이 시작됩니다!`
        );
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setRunMessage(`✅ ${data.message} (회차: ${data.label})`);
        setTimeout(() => {
          onRefresh();
        }, 1500);
      } else {
        setRunMessage(`❌ 요청 실패: ${data.message}`);
      }
    } catch (err: any) {
      setRunMessage(
        `☁️ 클라우드 호스팅 모드: 아래 [🚀 깃허브 클라우드 즉시 실행] 버튼을 클릭하시면 깃허브 가상 컴퓨터가 즉시 원격 수집을 가동합니다.`
      );
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-md">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-400" />
          수동 수집 실행 & 회차 트리거
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          특정 회차(예: 마감일 15시, 최종) 또는 특정 대학에 대해 즉시 경쟁률 웹 페이지를 크롤링하고 증빙 스크린샷과 백데이터를 생성합니다.
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 shadow-lg space-y-6">
        {/* 1. Collection Label */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            수집 회차 라벨 (Label)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 09월07일20시, 09월11일15시, 최종"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex gap-1.5 flex-wrap">
              {['09월07일20시', '09월08일20시', '09월09일20시', '09월10일20시', '09월11일10시', '09월11일14시', '09월11일15시', '최종'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setLabel(preset);
                    if (preset === '최종') setIsFinal(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. University Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              수집 대상 대학 선택 ({selectedUnivs.length}개 선택됨)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllGyodae}
                className="text-blue-400 hover:underline font-medium cursor-pointer"
              >
                교대 9개교 선택
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-slate-400 hover:underline font-medium cursor-pointer"
              >
                전체 선택
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-400 hover:underline font-medium cursor-pointer"
              >
                선택 해제
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
            {universities.map((u) => {
              const isSelected = selectedUnivs.includes(u.key);
              return (
                <div
                  key={u.key}
                  onClick={() => toggleUniv(u.key)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <div className="truncate">
                    <div className="text-xs font-bold">{u.key}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {u.fullName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Options Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-700/60 cursor-pointer hover:bg-slate-900/60 transition">
            <input
              type="checkbox"
              checked={generateReport}
              onChange={(e) => setGenerateReport(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                취합 보고서 (통합 엑셀) 자동 생성
              </div>
              <div className="text-[10px] text-slate-400">
                수집 완료 후 모든 스냅샷을 병합하여 팀 통합 보고서를 출력합니다.
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-700/60 cursor-pointer hover:bg-slate-900/60 transition">
            <input
              type="checkbox"
              checked={isFinal}
              onChange={(e) => setIsFinal(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                최종 마감 경쟁률 플래그
              </div>
              <div className="text-[10px] text-slate-400">
                라벨에 '최종' 표기 및 최종 증빙 파일명으로 저장합니다.
              </div>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleRun}
            disabled={isCollecting}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition shadow-lg ${
              isCollecting
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 cursor-pointer'
            }`}
          >
            <Play className={`w-4 h-4 ${isCollecting ? 'animate-spin' : ''}`} />
            {isCollecting ? '수집 작업 실행 중...' : '선택한 대학 수집 시작'}
          </button>
        </div>

        {/* Run Message Feedback & Cloud Action Trigger */}
        {runMessage && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 space-y-3">
            <p className="font-mono">{runMessage}</p>
            <div className="pt-1 flex flex-wrap gap-2">
              <a
                href="https://github.com/ibrkiller-penz/jinhak/actions/workflows/daily_collector.yml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                🚀 깃허브 클라우드 원격 즉시 실행 (Run workflow)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
