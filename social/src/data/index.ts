import type { Subject, Unit } from '../types';
import { integrated1 } from './integrated1';
import { integrated2 } from './integrated2';

// 새 과목(예: 국어)은 같은 형식으로 파일을 만들어 여기에 추가하면 된다.
export const SUBJECTS: Subject[] = [integrated1, integrated2];

export const findUnit = (unitId: string): { subject: Subject; unit: Unit } | null => {
  for (const subject of SUBJECTS) {
    const unit = subject.units.find((u) => u.id === unitId);
    if (unit) return { subject, unit };
  }
  return null;
};
