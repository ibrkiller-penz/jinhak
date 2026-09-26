export interface TeacherRange {
  id: string;
  teacher: string;
  unitId: string;
  unitLabel: string;
  ranges: string[];
  note?: string;
}

export interface ExamInfo {
  id: string;
  title: string;
  subjectId: string;
  format: string;
  teachers: TeacherRange[];
}

// 통합사회 1학년 2학기 중간고사 시험범위 (학교 배포 안내문 기준)
export const CURRENT_EXAM: ExamInfo = {
  id: '2026-2-mid',
  title: '통합사회 1학년 2학기 중간고사',
  subjectId: 'is2',
  format: '선택형 20문항 · 서답형 4문항',
  teachers: [
    {
      id: 'moon',
      teacher: '문지영',
      unitId: 'is2-1',
      unitLabel: 'Ⅰ단원',
      ranges: ['교과서 p.10 ~ 21 (7번째 줄, ①단원까지)'],
      note: '프린트 참조',
    },
    {
      id: 'lee',
      teacher: '이지애',
      unitId: 'is2-2',
      unitLabel: 'Ⅱ단원',
      ranges: ['교과서 p.40 ~ 50', '학습지 1 ~ 6쪽'],
    },
    {
      id: 'yoon',
      teacher: '윤경식',
      unitId: 'is2-3',
      unitLabel: 'Ⅲ단원',
      ranges: ['교과서 p.68 ~ 82'],
    },
    {
      id: 'jang',
      teacher: '장종수',
      unitId: 'is2-5',
      unitLabel: 'Ⅴ단원',
      ranges: ['교과서 p.127 ~ 135'],
    },
  ],
};
