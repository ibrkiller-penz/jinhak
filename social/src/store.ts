import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyState, UnitProgress } from './types';
import { loadRemote, saveRemote, watchUser, type User } from './firebase';

const KEY = 'social-study-state-v1';
const EMPTY: StudyState = { progress: {}, wrong: {}, knownTerms: {} };

const readLocal = (): StudyState => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
};

const writeLocal = (s: StudyState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장 불가 환경은 무시 */
  }
};

// 로컬과 원격 기록을 합친다: 단원별 최고 점수·시도 횟수는 큰 값, 오답/암기 기록은 합집합.
const merge = (a: StudyState, b: StudyState): StudyState => {
  const progress: Record<string, UnitProgress> = { ...a.progress };
  for (const [id, p] of Object.entries(b.progress)) {
    const q = progress[id];
    progress[id] = q
      ? {
          bestScore: Math.max(p.bestScore, q.bestScore),
          attempts: Math.max(p.attempts, q.attempts),
          lastStudied: Math.max(p.lastStudied, q.lastStudied),
        }
      : p;
  }
  return {
    progress,
    wrong: { ...a.wrong, ...b.wrong },
    knownTerms: { ...a.knownTerms, ...b.knownTerms },
  };
};

export const useStudyStore = () => {
  const [state, setState] = useState<StudyState>(readLocal);
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(
    () =>
      watchUser(async (u) => {
        userRef.current = u;
        setUser(u);
        if (!u) return;
        const remote = await loadRemote<StudyState>(u.uid).catch(() => null);
        setState((local) => {
          const merged = remote ? merge(local, { ...EMPTY, ...remote }) : local;
          writeLocal(merged);
          saveRemote(u.uid, merged).catch(() => {});
          return merged;
        });
      }),
    [],
  );

  const update = useCallback((fn: (s: StudyState) => StudyState) => {
    setState((prev) => {
      const next = fn(prev);
      writeLocal(next);
      if (userRef.current) saveRemote(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  const recordQuiz = useCallback(
    (unitId: string, score: number, results: boolean[]) =>
      update((s) => {
        const prev = s.progress[unitId];
        const wrong = { ...s.wrong };
        const now = Date.now();
        results.forEach((ok, index) => {
          const key = `${unitId}:${index}`;
          if (ok) delete wrong[key];
          else wrong[key] = { key, unitId, index, count: (wrong[key]?.count ?? 0) + 1, lastWrong: now };
        });
        return {
          ...s,
          wrong,
          progress: {
            ...s.progress,
            [unitId]: {
              bestScore: Math.max(score, prev?.bestScore ?? 0),
              attempts: (prev?.attempts ?? 0) + 1,
              lastStudied: now,
            },
          },
        };
      }),
    [update],
  );

  const resolveWrong = useCallback(
    (key: string) =>
      update((s) => {
        const wrong = { ...s.wrong };
        delete wrong[key];
        return { ...s, wrong };
      }),
    [update],
  );

  const toggleKnown = useCallback(
    (key: string) =>
      update((s) => {
        const knownTerms = { ...s.knownTerms };
        if (knownTerms[key]) delete knownTerms[key];
        else knownTerms[key] = true;
        return { ...s, knownTerms };
      }),
    [update],
  );

  return { state, user, recordQuiz, resolveWrong, toggleKnown };
};

export type StudyStore = ReturnType<typeof useStudyStore>;
