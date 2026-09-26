import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Term } from '../types';

interface Props {
  unitId: string;
  terms: Term[];
  known: Record<string, true>;
  onToggleKnown: (key: string) => void;
}

export const Flashcards = ({ unitId, terms, known, onToggleKnown }: Props) => {
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const term = terms[pos];
  const key = `${unitId}:${term.term}`;
  const knownCount = terms.filter((t) => known[`${unitId}:${t.term}`]).length;

  const go = (d: number) => {
    setFlipped(false);
    setPos((p) => (p + d + terms.length) % terms.length);
  };

  return (
    <div>
      <div className="mb-3 flex justify-between text-sm text-slate-500">
        <span>
          {pos + 1} / {terms.length}
        </span>
        <span>
          외운 용어 {knownCount} / {terms.length}
        </span>
      </div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className={`flip-card block h-56 w-full ${flipped ? 'flipped' : ''}`}
      >
        <div className="flip-inner relative h-full w-full">
          <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-bold">{term.term}</div>
            <div className="mt-3 text-xs text-slate-400">눌러서 뜻 보기</div>
          </div>
          <div className="flip-face flip-back absolute inset-0 flex items-center justify-center rounded-2xl bg-teal-700 p-6 text-center text-lg leading-relaxed text-white shadow-sm">
            {term.def}
          </div>
        </div>
      </button>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button onClick={() => go(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="이전">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => onToggleKnown(key)}
          className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium ${
            known[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Check className="h-4 w-4" />
          {known[key] ? '외웠어요' : '외웠으면 체크'}
        </button>
        <button onClick={() => go(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="다음">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
