import { useMemo, useState } from 'react';
import { BookMarked, RotateCcw } from 'lucide-react';
import { findUnit } from '../data';
import { Quiz, type QuizItem } from '../components/Quiz';
import type { StudyStore } from '../store';

export const WrongPage = ({ store }: { store: StudyStore }) => {
  const [retrying, setRetrying] = useState<QuizItem[] | null>(null);

  const items = useMemo(
    () =>
      Object.values(store.state.wrong)
        .sort((a, b) => b.lastWrong - a.lastWrong)
        .flatMap((w) => {
          const found = findUnit(w.unitId);
          const question = found?.unit.quiz[w.index];
          return found && question ? [{ note: w, unitTitle: found.unit.title, item: { unitId: w.unitId, index: w.index, question } }] : [];
        }),
    [store.state.wrong],
  );

  if (retrying) {
    return (
      <div>
        <button onClick={() => setRetrying(null)} className="mb-4 text-sm text-slate-500 hover:text-teal-600">
          ← 오답노트로
        </button>
        <Quiz
          items={retrying}
          onFinish={(results) => results.filter((r) => r.ok).forEach((r) => store.resolveWrong(`${r.item.unitId}:${r.item.index}`))}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <BookMarked className="h-6 w-6 text-rose-500" />
        <h1 className="text-2xl font-bold">오답노트</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">다시 풀어서 맞히면 오답노트에서 빠집니다.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          틀린 문제가 없습니다. 퀴즈를 풀어 보세요!
        </div>
      ) : (
        <>
          <button
            onClick={() => setRetrying(items.map((i) => i.item))}
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            <RotateCcw className="h-4 w-4" />
            틀린 문제 {items.length}개 다시 풀기
          </button>
          <ul className="mt-5 space-y-3">
            {items.map(({ note, unitTitle, item }) => (
              <li key={note.key} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-teal-600">{unitTitle}</span>
                  <span>{note.count}회 오답</span>
                </div>
                <p className="mt-1 font-medium">{item.question.q}</p>
                <p className="mt-2 text-sm text-emerald-700">
                  정답: {item.question.choices[item.question.answer]}
                </p>
                <p className="mt-1 text-sm text-slate-500">{item.question.explain}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
