import React, { useState, useMemo } from 'react';
import type { University } from '../types';
import { UniversityCard } from '../components/UniversityCard';
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface DashboardPageProps {
  universities: University[];
  onSelectUniv: (key: string) => void;
  onPreviewCapture: (url: string, title: string) => void;
  onQuickCollect: () => void;
  isCollecting: boolean;
}

const ITEMS_PER_PAGE = 32;

export const DashboardPage: React.FC<DashboardPageProps> = ({
  universities,
  onSelectUniv,
  onPreviewCapture,
  onQuickCollect,
  isCollecting,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'ratio-desc' | 'ratio-asc' | 'applicants-desc' | 'capacity-desc' | 'name-asc'>('ratio-desc');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: universities.length,
      '4년제': 0,
      '전문대': 0,
      '교대': 0,
      '과기원/특수대': 0,
    };
    for (const u of universities) {
      const cat = u.category || '4년제';
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts['4년제'] += 1;
      }
    }
    return counts;
  }, [universities]);

  // Filtering & Searching
  const filteredUnivs = useMemo(() => {
    return universities.filter((u) => {
      // Category filter
      if (categoryFilter !== 'all') {
        const uCat = u.category || '4년제';
        if (categoryFilter === '4년제' && uCat !== '4년제') return false;
        if (categoryFilter === '전문대' && uCat !== '전문대') return false;
        if (categoryFilter === '교대' && uCat !== '교대') return false;
        if (categoryFilter === '과기원/특수대' && uCat !== '과기원/특수대') return false;
      }

      // Region filter
      if (regionFilter !== 'all') {
        const uRegions = u.regions || (u.region ? [u.region] : []);
        const matchesRegion = uRegions.some((r) => {
          if (regionFilter === '서울') return r.includes('서울');
          if (regionFilter === '경기/인천') return r.includes('경기') || r.includes('인천');
          if (regionFilter === '충청/대전/세종') return r.includes('충북') || r.includes('충남') || r.includes('대전') || r.includes('세종');
          if (regionFilter === '전라/광주') return r.includes('전북') || r.includes('전남') || r.includes('광주');
          if (regionFilter === '경상/대구/부산/울산') return r.includes('경북') || r.includes('경남') || r.includes('대구') || r.includes('부산') || r.includes('울산');
          if (regionFilter === '강원') return r.includes('강원');
          if (regionFilter === '제주') return r.includes('제주');
          return r.includes(regionFilter);
        });
        if (!matchesRegion) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const keyMatch = u.key.toLowerCase().includes(q);
        const nameMatch = u.fullName.toLowerCase().includes(q);
        const regionMatch = (u.region || '').toLowerCase().includes(q);
        return keyMatch || nameMatch || regionMatch;
      }

      return true;
    });
  }, [universities, categoryFilter, regionFilter, search]);

  // Sorting
  const sortedUnivs = useMemo(() => {
    const list = [...filteredUnivs];
    list.sort((a, b) => {
      const snapA = a.latestSnapshot;
      const snapB = b.latestSnapshot;
      const getNumRatio = (snap: any) => {
        if (!snap?.ratio) return 0;
        const m = String(snap.ratio).match(/([\d.]+)/);
        return m ? parseFloat(m[1]) : 0;
      };

      if (sortBy === 'ratio-desc') {
        return getNumRatio(snapB) - getNumRatio(snapA);
      }
      if (sortBy === 'ratio-asc') {
        return getNumRatio(snapA) - getNumRatio(snapB);
      }
      if (sortBy === 'applicants-desc') {
        return (snapB?.jiwon || 0) - (snapA?.jiwon || 0);
      }
      if (sortBy === 'capacity-desc') {
        return (snapB?.mojip || 0) - (snapA?.mojip || 0);
      }
      if (sortBy === 'name-asc') {
        return a.key.localeCompare(b.key, 'ko');
      }
      return 0;
    });
    return list;
  }, [filteredUnivs, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedUnivs.length / ITEMS_PER_PAGE));
  const paginatedUnivs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedUnivs.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedUnivs, currentPage]);

  // Reset page on filter changes
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };
  const handleRegionChange = (reg: string) => {
    setRegionFilter(reg);
    setCurrentPage(1);
  };
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  // KPI Statistics (for filtered or total)
  const totalJiwon = useMemo(() => {
    return universities.reduce((sum, u) => sum + (u.latestSnapshot?.jiwon || 0), 0);
  }, [universities]);

  const totalMojip = useMemo(() => {
    return universities.reduce((sum, u) => sum + (u.latestSnapshot?.mojip || 0), 0);
  }, [universities]);

  const avgRatio = totalMojip > 0 ? (totalJiwon / totalMojip).toFixed(2) + ' : 1' : '-';

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Universities */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">전체 수시 개설 대학</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">
              {universities.length}개교
            </h4>
          </div>
        </div>

        {/* KPI 2: Filtered Display Count */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">현재 조회 대상 대학</p>
            <h4 className="text-2xl font-bold text-emerald-400 mt-0.5">
              {filteredUnivs.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {universities.length}
              </span>
            </h4>
          </div>
        </div>

        {/* KPI 3: Total Applicants */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">전체 수시 총 지원인원</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">
              {totalJiwon.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">명</span>
            </h4>
          </div>
        </div>

        {/* KPI 4: Overall Average Ratio */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">전체 대학 평균 경쟁률</p>
            <h4 className="text-2xl font-bold text-amber-400 mt-0.5">
              {avgRatio}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Filter & Control Panel */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-4">
        {/* Row 1: Category Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: '전체 대학', count: categoryCounts.all },
              { id: '4년제', label: '일반 4년제', count: categoryCounts['4년제'] },
              { id: '전문대', label: '전문대학', count: categoryCounts['전문대'] },
              { id: '교대', label: '교대·사범대', count: categoryCounts['교대'] },
              { id: '과기원/특수대', label: '과기원·특수대', count: categoryCounts['과기원/특수대'] },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleCategoryChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700/60 hover:text-white border border-slate-700/40'
                }`}
              >
                {tab.label}{' '}
                <span className={`ml-1 text-[11px] font-normal ${categoryFilter === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
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
            {isCollecting ? '수집 진행 중...' : '실시간 크롤링 실행'}
          </button>
        </div>

        {/* Row 2: Region Filter & Search & Sort */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
          {/* Region Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-bold text-slate-400 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5 text-blue-400" /> 지역:
            </span>
            {[
              { id: 'all', label: '전체' },
              { id: '서울', label: '서울' },
              { id: '경기/인천', label: '경기/인천' },
              { id: '충청/대전/세종', label: '충청/대전/세종' },
              { id: '전라/광주', label: '전라/광주' },
              { id: '경상/대구/부산/울산', label: '경상/부산/대구' },
              { id: '강원', label: '강원' },
              { id: '제주', label: '제주' },
            ].map((reg) => (
              <button
                key={reg.id}
                onClick={() => handleRegionChange(reg.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  regionFilter === reg.id
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Search Box & Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="대학명, 학과, 지역 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ratio-desc">경쟁률 높은 순</option>
                <option value="ratio-asc">경쟁률 낮은 순</option>
                <option value="applicants-desc">지원인원 많은 순</option>
                <option value="capacity-desc">모집인원 많은 순</option>
                <option value="name-asc">대학명 가나다순</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* University Grid */}
      {paginatedUnivs.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <p className="text-sm font-semibold text-slate-300">검색 조건에 일치하는 대학이 없습니다.</p>
          <p className="text-xs">다른 검색어를 입력하시거나 필터를 초기화해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8 gap-3">
          {paginatedUnivs.map((univ) => (
            <UniversityCard
              key={univ.key}
              univ={univ}
              onSelect={onSelectUniv}
              onPreviewCapture={onPreviewCapture}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800/80 px-5 py-3.5 rounded-2xl border border-slate-700/80 shadow-md">
          <p className="text-xs text-slate-400">
            총 <strong className="text-white font-mono">{filteredUnivs.length}</strong>개 대학 중{' '}
            <strong className="text-blue-400 font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> -{' '}
            <strong className="text-blue-400 font-mono">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredUnivs.length)}
            </strong>
            개 표시 중
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-700/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-xl transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-300 px-3 py-1.5 bg-slate-900/60 rounded-xl border border-slate-700/60 font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-700/60 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-xl transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
