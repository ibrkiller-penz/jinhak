import React from 'react';
import type { University } from '../types';
import {
  ExternalLink,
  Camera,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
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
  const isOk = snap?.status === 'ok';
  const isSkip = snap?.status === 'skip' || snap?.status === 'pre';
  const isError = snap?.status === 'error';

  return (
    <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top Header: University Name + Platform & Status Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3
                onClick={() => onSelect(univ.key)}
                className="font-bold text-lg text-white hover:text-blue-400 cursor-pointer transition flex items-center gap-1.5"
              >
                {univ.key}
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                ({univ.region})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{univ.fullName}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                univ.platform === 'jinhakapply'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {univ.platform === 'jinhakapply' ? '진학사' : '유웨이'}
            </span>

            {isOk && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 수집완료
              </span>
            )}
            {isSkip && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-3 h-3" /> 접수대기
              </span>
            )}
            {isError && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="w-3 h-3" /> 확인필요
              </span>
            )}
          </div>
        </div>

        {/* Main Ratio & Applicant Display */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-700/40 my-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">총 경쟁률</span>
            {snap?.ratioDiff !== undefined && snap?.ratioDiff !== null && (
              <div
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  snap.ratioDiff > 0
                    ? 'text-rose-400'
                    : snap.ratioDiff < 0
                    ? 'text-blue-400'
                    : 'text-slate-400'
                }`}
              >
                {snap.ratioDiff > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : snap.ratioDiff < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {snap.ratioDiff > 0 ? `+${snap.ratioDiff}` : snap.ratioDiff}
              </div>
            )}
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-white">
              {snap?.ratio || '-'}
            </span>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-200">
                {snap?.jiwon?.toLocaleString() || 0}
              </span>
              <span className="text-xs text-slate-400">
                {' '}
                / {snap?.mojip?.toLocaleString() || 0}명
              </span>
            </div>
          </div>
        </div>

        {/* Notice or Guide message if present */}
        {snap?.notice && (
          <div className="flex items-start gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 my-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{snap.notice}</span>
          </div>
        )}
      </div>

      {/* Card Footer: Last Round info + Capture & Detail Buttons */}
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{snap?.label || '수집 이력 없음'}</span>
        </div>

        <div className="flex items-center gap-2">
          {snap?.captureUrl && (
            <button
              onClick={() => onPreviewCapture(snap.captureUrl!, univ.key)}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition cursor-pointer"
              title="증빙 캡쳐 미리보기"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {univ.ratioUrl && (
            <a
              href={univ.ratioUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              title="대학 경쟁률 원문 페이지 열기"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => onSelect(univ.key)}
            className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition cursor-pointer"
          >
            상세보기
          </button>
        </div>
      </div>
    </div>
  );
};
