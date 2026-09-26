import { useState } from 'react';
import { ArrowLeft, BookOpen, FileText, Layers, PenLine } from 'lucide-react';
import { findUnit } from '../data';
import { CURRENT_EXAM } from '../data/exam';
import { Flashcards } from '../components/Flashcards';
import { Quiz } from '../components/Quiz';
import type { StudyStore } from '../store';

type Tab = 'concept' | 'cards' | 'quiz';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'concept', label: '핵심 개념', icon: BookOpen },
  { id: 'cards', label: '용어 카드', icon: Layers },
  { id: 'quiz', label: '퀴즈', icon: PenLine },
];

interface Props {
  unitId: string;
  teacherId?: string;
  store: StudyStore;
}

export const UnitPage = ({ unitId, teacherId, store }: Props) => {
  const [tab, setTab] = useState<Tab>('concept');
  const found = findUnit(unitId);
  const teacher = CURRENT_EXAM.teachers.find((t) => t.id === teacherId);

  if (!found) {
    return (
      <p className="text-slate-500">
        단원을 찾을 수 없습니다. <a href="#/" className="text-teal-600 underline">처음으로</a>
      </p>
    );
  }
  const { subject, unit } = found;

  return (
    <div>
      <a href="#/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600">
        <ArrowLeft className="h-4 w-4" />
        처음으로
      </a>
      <div className="mt-3">
        <div className="text-sm font-semibold text-teal-600">{subject.name}</div>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="mt-1 text-slate-500">{unit.subtitle}</p>
      </div>

      {teacher && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-bold">
            {teacher.teacher} 선생님 시험범위 · {teacher.unitLabel}
          </div>
          <ul className="mt-1 space-y-0.5">
            {teacher.ranges.map((r) => (
              <li key={r} className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {r}
              </li>
            ))}
          </ul>
          {teacher.note && <div className="mt-1 text-xs">※ {teacher.note}</div>}
        </div>
      )}

      <div className="sticky top-14 z-10 -mx-4 mt-6 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur">
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium ${
                tab === id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === 'concept' && (
          <div className="space-y-4">
            {unit.summary.map((s) => (
              <section key={s.heading} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 font-bold text-teal-800">{s.heading}</h2>
                <ul className="space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2 leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <button
              onClick={() => setTab('quiz')}
              className="w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700"
            >
              개념 확인 퀴즈 풀기
            </button>
          </div>
        )}
        {tab === 'cards' && (
          <Flashcards
            unitId={unit.id}
            terms={unit.terms}
            known={store.state.knownTerms}
            onToggleKnown={store.toggleKnown}
          />
        )}
        {tab === 'quiz' && (
          <Quiz
            items={unit.quiz.map((question, index) => ({ unitId: unit.id, index, question }))}
            onFinish={(results) => {
              const score = Math.round((results.filter((r) => r.ok).length / results.length) * 100);
              store.recordQuiz(unit.id, score, results.map((r) => r.ok));
            }}
          />
        )}
      </div>
    </div>
  );
};
