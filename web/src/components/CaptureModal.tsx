import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface CaptureModalProps {
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({ imageUrl, title, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-w-5xl w-full max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white">📸 {title} 증빙 스크린샷</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="새 창에서 원본 보기"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable Image) */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full h-auto rounded-lg shadow-lg border border-slate-800 object-contain"
          />
        </div>
      </div>
    </div>
  );
};
