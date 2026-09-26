import { CalendarCheck, ChevronRight, FileText, UserRound } from 'lucide-react';
import { CURRENT_EXAM } from '../data/exam';
import { findUnit, SUBJECTS } from '../data';
import { ProgressBar } from '../components/ProgressBar';
import { unitHref } from '../router';
import type { StudyStore } from '../store';

export const HomePage = ({ store }: { store: StudyStore }) => {
  const { progress } = store.state;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-teal-100">
          <CalendarCheck className="h-4 w-4" />
          시험 대비
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{CURRENT_EXAM.title}</h1>
        <p className="mt-2 text-teal-50">
          {CURRENT_EXAM.format} · 담당 선생님별 범위를 골라 공부하세요.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">선생님별 시험범위</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {CURRENT_EXAM.teachers.map((t) => {
            const found = findUnit(t.unitId);
            const p = progress[t.unitId];
            return (
              <a
                key={t.id}
                href={unitHref(t.unitId, t.id)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold">{t.teacher} 선생님</div>
                    <div className="truncate text-sm text-slate-500">
                      {t.unitLabel} {found?.unit.title}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-500" />
                </div>
                <ul className="mt-4 space-y-1 text-sm text-slate-600">
                  {t.ranges.map((r) => (
                    <li key={r} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      {r}
                    </li>
                  ))}
                  {t.note && <li className="pl-6 text-xs text-amber-600">※ {t.note}</li>}
                </ul>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={p?.bestScore ?? 0} />
                  <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                    {p ? `최고 ${p.bestScore}점` : '미응시'}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {SUBJECTS.map((s) => (
        <section key={s.id}>
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-bold">{s.name}</h2>
            <span className="text-sm text-slate-500">{s.description}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.units.map((u, i) => {
              const p = progress[u.id];
              return (
                <a
                  key={u.id}
                  href={unitHref(u.id)}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-teal-600">{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i]}단원</div>
                  <div className="mt-0.5 font-bold">{u.title}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{u.subtitle}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <ProgressBar value={p?.bestScore ?? 0} />
                    <span className="w-10 shrink-0 text-right text-xs text-slate-500">{p ? `${p.bestScore}` : '-'}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
