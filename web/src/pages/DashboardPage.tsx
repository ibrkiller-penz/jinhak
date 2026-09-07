import React, { useState } from 'react';
import type { University } from '../types';
import { UniversityCard } from '../components/UniversityCard';
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
  Play,
  Search,
} from 'lucide-react';

interface DashboardPageProps {
  universities: University[];
  onSelectUniv: (key: string) => void;
  onPreviewCapture: (url: string, title: string) => void;
  onQuickCollect: () => void;
  isCollecting: boolean;
}

const TECH_KEYS = ['DGIST', 'GIST', 'KAIST', 'KENTECH', 'POSTECH', 'UNIST'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  universities,
  onSelectUniv,
  onPreviewCapture,
  onQuickCollect,
  isCollecting,
}) => {
  const [filter, setFilter] = useState<'all' | 'gyodae' | 'tech' | 'ok'>('all');
  const [search, setSearch] = useState('');

  const isTech = (key: string) => TECH_KEYS.includes(key);

  // 필터링
  const filteredUnivs = universities.filter((u) => {
    if (filter === 'gyodae' && isTech(u.key)) return false;
    if (filter === 'tech' && !isTech(u.key)) return false;
    if (filter === 'ok' && u.latestSnapshot?.status !== 'ok') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.key.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI 집계
  const gyodaeList = universities.filter((u) => !isTech(u.key));
  const techList = universities.filter((u) => isTech(u.key));
  const okList = universities.filter((u) => u.latestSnapshot?.status === 'ok');
  const totalJiwon = okList.reduce(
    (sum, u) => sum + (u.latestSnapshot?.jiwon || 0),
    0
  );
  const totalMojip = okList.reduce(
    (sum, u) => sum + (u.latestSnapshot?.mojip || 0),
    0
  );
  const avgRatio =
    totalMojip > 0 ? (totalJiwon / totalMojip).toFixed(2) + ' : 1' : '-';


  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">관리 대상 대학</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">
              {universities.length}개교
            </h4>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">수집 완료 대학</p>
            <h4 className="text-2xl font-bold text-emerald-400 mt-0.5">
              {okList.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {universities.length}
              </span>
            </h4>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">수집 교대 총 지원인원</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">
              {totalJiwon.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">명</span>
            </h4>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">수집 교대 평균 경쟁률</p>
            <h4 className="text-2xl font-bold text-amber-400 mt-0.5">
              {avgRatio}
            </h4>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Batch Collect Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            전체 대학 ({universities.length})
          </button>
          <button
            onClick={() => setFilter('gyodae')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'gyodae'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            교대 계열 ({gyodaeList.length})
          </button>
          <button
            onClick={() => setFilter('tech')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'tech'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            과기원/특성화대 ({techList.length})
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'ok'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            수집 완료 ({okList.length})
          </button>
        </div>

        {/* Search & Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="대학명, 지역 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 text-xs text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={onQuickCollect}
            disabled={isCollecting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              isCollecting
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 cursor-pointer'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isCollecting ? 'animate-spin' : ''}`} />
            {isCollecting ? '수집 진행 중...' : '전체 즉시 수집'}
          </button>
        </div>
      </div>

      {/* University Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUnivs.map((univ) => (
          <UniversityCard
            key={univ.key}
            univ={univ}
            onSelect={onSelectUniv}
            onPreviewCapture={onPreviewCapture}
          />
        ))}
      </div>
    </div>
  );
};
