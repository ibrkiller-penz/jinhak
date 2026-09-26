import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import type { Question } from '../types';

export interface QuizItem {
  unitId: string;
  index: number;
  question: Question;
}

interface Props {
  items: QuizItem[];
  onFinish: (results: { item: QuizItem; ok: boolean }[]) => void;
}

export const Quiz = ({ items, onFinish }: Props) => {
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<{ item: QuizItem; ok: boolean }[]>([]);
  const done = results.length === items.length && picked === null;

  if (items.length === 0) return <p className="text-slate-500">문제가 없습니다.</p>;

  if (done) {
    const correct = results.filter((r) => r.ok).length;
    const score = Math.round((correct / items.length) * 100);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="text-sm text-slate-500">결과</div>
        <div className={`mt-1 text-5xl font-extrabold ${score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
          {score}점
        </div>
        <div className="mt-1 text-slate-600">
          {items.length}문제 중 {correct}문제 정답
        </div>
        {correct < items.length && (
          <p className="mt-3 text-sm text-slate-500">틀린 문제는 오답노트에 저장되었습니다.</p>
        )}
        <button
          onClick={() => {
            setPos(0);
            setResults([]);
          }}
          className="mt-5 inline-flex items-center gap-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <RotateCcw className="h-4 w-4" />
          다시 풀기
        </button>
      </div>
    );
  }

  const item = items[pos];
  const { question } = item;
  const isOX = question.choices.length === 2 && question.choices[0] === 'O';

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setResults((r) => [...r, { item, ok: i === question.answer }]);
  };

  const next = () => {
    setPicked(null);
    if (pos + 1 < items.length) setPos(pos + 1);
    else onFinish(results);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {pos + 1} / {items.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{isOX ? 'OX' : '선택형'}</span>
      </div>
      <p className="text-lg font-semibold leading-relaxed">{question.q}</p>

      <div className={`mt-5 grid gap-2 ${isOX ? 'grid-cols-2' : ''}`}>
        {question.choices.map((c, i) => {
          const state =
            picked === null ? 'idle' : i === question.answer ? 'answer' : i === picked ? 'wrong' : 'dim';
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                isOX ? 'justify-center text-2xl font-bold' : ''
              } ${
                state === 'idle'
                  ? 'border-slate-200 hover:border-teal-400 hover:bg-teal-50'
                  : state === 'answer'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : state === 'wrong'
                      ? 'border-rose-400 bg-rose-50 text-rose-800'
                      : 'border-slate-100 text-slate-400'
              }`}
            >
              {!isOX && <span className="text-sm font-bold text-slate-400">{'①②③④⑤'[i]}</span>}
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="mt-5">
          <div
            className={`flex items-start gap-2 rounded-xl p-4 text-sm ${
              picked === question.answer ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
            }`}
          >
            {picked === question.answer ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <div className="font-bold">{picked === question.answer ? '정답!' : '오답'}</div>
              <div className="mt-1">{question.explain}</div>
            </div>
          </div>
          <button
            onClick={next}
            className="mt-4 w-full rounded-xl bg-slate-800 py-3 font-medium text-white hover:bg-slate-900"
          >
            {pos + 1 < items.length ? '다음 문제' : '결과 보기'}
          </button>
        </div>
      )}
    </div>
  );
};
