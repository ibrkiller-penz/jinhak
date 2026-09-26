# 사회 학습실 (social-study)

통합사회 시험 대비 학습 사이트. 선생님별 시험범위 → 단원별 **핵심 개념 · 용어 카드 · 퀴즈 · 오답노트**.

- 로그인 없이도 동작(브라우저에 기록 저장)
- Firebase 설정 시 Google 로그인으로 기록이 기기 간 동기화 (Firestore `users/{uid}`)

## 내용 수정
- 시험범위·선생님: `src/data/exam.ts`
- 단원 내용(개념/용어/퀴즈): `src/data/integrated1.ts`, `src/data/integrated2.ts`
- 새 과목 추가: 같은 형식 파일을 만들고 `src/data/index.ts` 의 `SUBJECTS` 에 추가

## 새 Firebase 프로젝트 연결
1. https://console.firebase.google.com → 프로젝트 추가 (예: `social-study-lab`)
2. 빌드 > Authentication > Google 사용 설정, Firestore Database 생성
3. 프로젝트 설정 > 내 앱 > 웹 앱 추가 → 설정값을 `.env.example` 참고해 `.env.local` 로 저장
4. `.firebaserc` 의 프로젝트 ID를 실제 ID로 수정

```bash
cd social
npm install
npm run dev          # 로컬 확인
npx firebase login
npm run deploy       # 빌드 + Hosting/Firestore 규칙 배포
```
