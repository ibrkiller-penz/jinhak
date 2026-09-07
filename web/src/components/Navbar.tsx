import React from 'react';
import { Activity, RefreshCw, BarChart3, FileSpreadsheet, PlayCircle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'detail' | 'manual' | 'reports';
  setCurrentTab: (tab: 'dashboard' | 'detail' | 'manual' | 'reports') => void;
  isCollecting: boolean;
  serverTime: string;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isCollecting,
  serverTime: _serverTime,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">2027 수시 교대 경쟁률</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
                  정보분석3팀
                </span>
              </div>
              <p className="text-xs text-slate-400">실시간 자동 수집 & 취합 시스템</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              현황 대시보드
            </button>
            <button
              onClick={() => setCurrentTab('manual')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'manual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              수동 실행
            </button>
            <button
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              취합 보고서 & 로그
            </button>
          </nav>

          {/* Right Status & Refresh Button */}
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="relative flex h-2 w-2">
                {isCollecting ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                )}
              </span>
              <span className="text-slate-300">
                {isCollecting ? '수집 작업 진행 중' : '수집기 대기 중'}
              </span>
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
