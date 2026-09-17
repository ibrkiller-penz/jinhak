import React from 'react';
import type { University } from '../types';
import {
  ExternalLink,
  Camera,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface UniversityCardProps {
  univ: University;
  onSelect: (key: string) => void;
  onPreviewCapture: (imageUrl: string, title: string) => void;
}

export const UniversityCard: React.FC<UniversityCardProps> = ({
  univ,
  onSelect,
  onPreviewCapture,
}) => {
  const snap = univ.latestSnapshot;

  return (
    <div
      onClick={() => onSelect(univ.key)}
      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/60 rounded-xl p-3 shadow-md hover:shadow-blue-500/10 transition-all duration-150 flex flex-col justify-between group cursor-pointer hover:-translate-y-0.5"
    >
      <div>
        {/* Top Header: Univ Key + Region & Platform */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 border ${
                univ.platform === 'jinhakapply'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {univ.platform === 'jinhakapply' ? '진학' : '유웨이'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              {univ.region ? univ.region.split(',')[0].trim() : ''}
            </span>
          </div>

          {snap?.ratioDiff !== undefined && snap?.ratioDiff !== null && snap.ratioDiff !== 0 && (
            <div
              className={`flex items-center text-[10px] font-bold ${
                snap.ratioDiff > 0 ? 'text-rose-400' : 'text-blue-400'
              }`}
            >
              {snap.ratioDiff > 0 ? (
                <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
              )}
              {snap.ratioDiff > 0 ? `+${snap.ratioDiff}` : snap.ratioDiff}
            </div>
          )}
        </div>

        {/* University Name */}
        <h3
          className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors truncate tracking-tight"
          title={univ.fullName || univ.key}
        >
          {univ.key}
        </h3>

        {/* Ratio & Numbers Box */}
        <div className="bg-slate-900/80 rounded-lg py-2 px-2.5 my-2 border border-slate-700/50 text-center group-hover:border-slate-600 transition-colors">
          <div className="text-base font-black text-white tracking-tight leading-tight">
            {snap?.ratio || '-'}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">
            <span className="text-slate-200 font-bold">{snap?.jiwon?.toLocaleString() || 0}</span>
            <span className="text-slate-400 text-[10px]"> / {snap?.mojip?.toLocaleString() || 0}명</span>
          </div>
        </div>
      </div>

      {/* Footer info & quick actions */}
      <div className="pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
        <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
          {univ.category || '4년제'}{univ.deptCount ? ` · ${univ.deptCount}과` : ''}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {snap?.captureUrl && (
            <button
              onClick={() => onPreviewCapture(snap.captureUrl!, univ.key)}
              className="p-1 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded transition cursor-pointer"
              title="증빙 캡처 미리보기"
            >
              <Camera className="w-3 h-3" />
            </button>
          )}

          {univ.ratioUrl && (
            <a
              href={univ.ratioUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded transition"
              title="공식 실시간 페이지 열기"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            onClick={() => onSelect(univ.key)}
            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition cursor-pointer"
            title="상세보기"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
