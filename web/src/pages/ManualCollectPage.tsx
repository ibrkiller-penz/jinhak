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
  const [categoryTab, setCategoryTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedUnivs, setSelectedUnivs] = useState<string[]>(
    universities.map((u) => u.key)
  );
  const [isFinal, setIsFinal] = useState(false);
  const [generateReport, setGenerateReport] = useState(true);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const toggleUniv = (key: string) => {
    setSelectedUnivs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectCategory = (cat: string) => {
    if (cat === '교대') {
      const keys = universities.filter((u) => u.category === '교대' || u.key.includes('교대') || u.key.includes('한국교원대')).map((u) => u.key);
      setSelectedUnivs(keys);
    } else if (cat === '과기원') {
      const keys = universities.filter((u) => (u.category || '').includes('과기원') || ['KAIST', 'POSTECH', 'GIST', 'DGIST', 'UNIST', 'KENTECH'].some(k => u.key.includes(k))).map((u) => u.key);
      setSelectedUnivs(keys);
    } else if (cat === '4년제') {
      const keys = universities.filter((u) => u.category === '4년제').map((u) => u.key);
      setSelectedUnivs(keys);
    } else if (cat === '전문대') {
      const keys = universities.filter((u) => u.category === '전문대').map((u) => u.key);
      setSelectedUnivs(keys);
    } else {
      setSelectedUnivs(universities.map((u) => u.key));
    }
  };

  const clearSelection = () => {
    setSelectedUnivs([]);
  };

  const filteredUniversities = universities.filter((u) => {
    if (categoryTab !== 'all') {
      if (categoryTab === '교대' && !(u.category === '교대' || u.key.includes('교대') || u.key.includes('한국교원대'))) return false;
      if (categoryTab === '과기원' && !((u.category || '').includes('과기원') || ['KAIST', 'POSTECH', 'GIST', 'DGIST', 'UNIST', 'KENTECH'].some(k => u.key.includes(k)))) return false;
      if (categoryTab === '4년제' && u.category !== '4년제') return false;
      if (categoryTab === '전문대' && u.category !== '전문대') return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.key.toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q) || (u.region || '').toLowerCase().includes(q);
    }
    return true;
  });

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
        setRunMessage(
          `🖥️ 로컬 1클릭 실행 안내: 바탕화면의 [2027_수시모집_수동실행.bat]을 더블클릭하시면 언제든지 전국 대학 실시간 수집 및 드라이브 전송이 즉시 수행됩니다!\n(원격 클라우드 수집은 아래 깃허브 액션 링크를 클릭하세요)`
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
        `🖥️ 바탕화면의 [2027_수시모집_수동실행.bat]을 더블클릭하시면 즉시 전국 246개 대학 수집 및 구글 드라이브 업로드가 가동됩니다!`
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-md">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-400" />
          2027 수시 경쟁률 수동 수집 & 트리거
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          특정 회차(예: 마감일 15시, 최종) 또는 특정 대학에 대해 즉시 경쟁률 웹 페이지를 크롤링하고 증빙 스크린샷과 백데이터를 생성하여 구글 드라이브로 자동 전송합니다.
        </p>
      </div>

      {/* Desktop Quick Runner Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-blue-900/30 to-slate-900/60 p-5 rounded-2xl border border-blue-500/30 shadow-md flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
            ⚡ 바탕화면 1클릭 즉시 수동 실행 파일 준비 완료
          </div>
          <div className="text-xs text-slate-300 mt-0.5">
            바탕화면의 <strong className="text-white font-mono">2027_수시모집_수동실행.bat</strong>을 더블클릭하시면 터미널 창에서 1번~5번 선택만으로 즉시 수집됩니다.
          </div>
        </div>
        <div className="text-xs px-3 py-1.5 bg-blue-600/30 border border-blue-400/40 text-blue-200 rounded-xl font-mono shrink-0">
          C:\Users\pc\Desktop\2027_수시모집_수동실행.bat
        </div>
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
              placeholder="예: 09월17일17시, 최종"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex gap-1.5 flex-wrap">
              {['09월17일16시', '09월17일17시', '09월17일18시', '최종'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setLabel(preset);
                    if (preset === '최종') setIsFinal(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. University Selection */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              수집 대상 대학 선택 ({selectedUnivs.length} / {universities.length}개 선택됨)
            </label>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => selectCategory('교대')}
                className="text-blue-400 hover:underline font-medium cursor-pointer"
              >
                교대 11개교
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => selectCategory('과기원')}
                className="text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                과기원 6개교
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => selectCategory('4년제')}
                className="text-emerald-400 hover:underline font-medium cursor-pointer"
              >
                4년제 178개교
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => selectCategory('all')}
                className="text-white hover:underline font-bold cursor-pointer"
              >
                전체(246개) 선택
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

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-700/60">
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {[
                { id: 'all', label: `전체 (${universities.length})` },
                { id: '4년제', label: '일반 4년제' },
                { id: '전문대', label: '전문대학' },
                { id: '교대', label: '교대·사범대' },
                { id: '과기원', label: '과기원·특수대' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCategoryTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    categoryTab === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900/40 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="대학 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 sm:w-48"
            />
          </div>

          {/* Univ Grid Picker */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60 max-h-80 overflow-y-auto">
            {filteredUniversities.map((u) => {
              const isSelected = selectedUnivs.includes(u.key);
              return (
                <div
                  key={u.key}
                  onClick={() => toggleUniv(u.key)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  )}
                  <div className="truncate text-xs font-medium">
                    <span className="font-bold">{u.key}</span>
                    <span className="text-[10px] text-slate-500 ml-1">({u.region})</span>
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
                취합 보고서 (통합 엑셀) 자동 생성 & 구글 드라이브 전송
              </div>
              <div className="text-[10px] text-slate-400">
                수집 완료 후 모든 스냅샷을 병합하여 마스터 보고서를 출력하고 드라이브에 저장합니다.
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
            {isCollecting ? '수집 작업 실행 중...' : `선택한 ${selectedUnivs.length}개 대학 수집 시작`}
          </button>
        </div>

        {/* Run Message Feedback & Cloud Action Trigger */}
        {runMessage && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 space-y-3">
            <p className="font-mono whitespace-pre-line">{runMessage}</p>
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
