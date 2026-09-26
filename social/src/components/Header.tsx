import { BookMarked, Globe2, LogIn, LogOut } from 'lucide-react';
import { firebaseEnabled, login, logout, type User } from '../firebase';

interface Props {
  user: User | null;
  wrongCount: number;
}

export const Header = ({ user, wrongCount }: Props) => (
  <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
      <a href="#/" className="flex items-center gap-2 font-bold text-teal-700">
        <Globe2 className="h-6 w-6" />
        <span className="text-lg">사회 학습실</span>
      </a>
      <nav className="ml-auto flex items-center gap-2">
        <a
          href="#/wrong"
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <BookMarked className="h-4 w-4" />
          오답노트
          {wrongCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{wrongCount}</span>
          )}
        </a>
        {firebaseEnabled &&
          (user ? (
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              title={user.email ?? ''}
            >
              {user.photoURL && <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full" />}
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          ) : (
            <button
              onClick={() => login().catch(() => alert('로그인에 실패했습니다.'))}
              className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <LogIn className="h-4 w-4" />
              로그인
            </button>
          ))}
      </nav>
    </div>
  </header>
);
