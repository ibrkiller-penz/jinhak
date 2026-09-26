export interface Term {
  term: string;
  def: string;
}

export interface Question {
  q: string;
  /** OX 문제는 ['O', 'X'] */
  choices: string[];
  /** choices 의 정답 인덱스 */
  answer: number;
  explain: string;
}

export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  summary: { heading: string; points: string[] }[];
  terms: Term[];
  quiz: Question[];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  units: Unit[];
}

export interface UnitProgress {
  bestScore: number; // 0~100
  attempts: number;
  lastStudied: number; // epoch ms
}

export interface WrongNote {
  key: string; // `${unitId}:${index}`
  unitId: string;
  index: number;
  count: number;
  lastWrong: number;
}

export interface StudyState {
  progress: Record<string, UnitProgress>;
  wrong: Record<string, WrongNote>;
  knownTerms: Record<string, true>; // `${unitId}:${term}`
}
