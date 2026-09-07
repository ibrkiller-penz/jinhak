import React, { useEffect, useState } from 'react';
import type { University } from './types';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { UniversityDetailPage } from './pages/UniversityDetailPage';
import { ManualCollectPage } from './pages/ManualCollectPage';
import { ReportsPage } from './pages/ReportsPage';
import { CaptureModal } from './components/CaptureModal';
import { PasswordModal } from './components/PasswordModal';
import { db, collection, getDocs } from './firebase';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'detail' | 'manual' | 'reports'>('dashboard');
  const [selectedUnivKey, setSelectedUnivKey] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [serverTime, setServerTime] = useState('');
  const [defaultLabel, setDefaultLabel] = useState('09월07일20시');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveTargetUrl, setDriveTargetUrl] = useState('https://drive.google.com/drive/u/0/folders/1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j');

  const fetchStatusAndUnivs = async () => {
    // 1. Try local FastAPI server first if available
    try {
      const resSt = await fetch('/api/status');
      if (resSt.ok) {
        const st = await resSt.json();
        setIsCollecting(st.isCollecting);
        setServerTime(st.serverTime);
        if (st.defaultLabel) setDefaultLabel(st.defaultLabel);
      }
    } catch {
      // Offline/Cloud mode
      setServerTime(new Date().toISOString());
    }

    try {
      const resUniv = await fetch('/api/universities');
      if (resUniv.ok) {
        const data = await resUniv.json();
        setUniversities(data || []);
        return;
      }
    } catch {
      // Local API not responding -> Fallback to direct Firebase Firestore!
    }

    // 2. Direct Firestore fetch fallback
    try {
      const querySnapshot = await getDocs(collection(db, '교대경쟁률'));
      const list: University[] = [];
      querySnapshot.forEach((d) => {
        const data = d.data();
        const lastSnap = data.lastSnapshot || {};
        const summary = lastSnap.summary || {};
        const mojip = lastSnap.mojip ?? summary.mojip ?? 0;
        const jiwon = lastSnap.jiwon ?? summary.jiwon ?? 0;
        const ratio = lastSnap.ratio ?? summary.ratio ?? '-';

        list.push({
          key: d.id,
          fullName: data.fullName || d.id,
          region: data.region || '전국',
          platform: data.platform || 'jinhakapply',
          ratioUrl: data.ratioUrl || null,
          acceptStart: data.acceptStart || null,
          acceptEnd: data.acceptEnd || null,
          inScope: data.inScope !== false,
          note: data.note || '',
          totalRounds: data.totalRounds || 7,
          snapshotCount: data.snapshotCount || 1,
          latestSnapshot: {
            label: lastSnap.label || '09월07일20시',
            capturedAt: lastSnap.capturedAt || new Date().toISOString(),
            status: (lastSnap.status as any) || (data.ratioUrl ? 'ok' : 'pre'),
            notice: lastSnap.notice || null,
            mojip,
            jiwon,
            ratio,
            captureUrl: lastSnap.screenshot?.webViewLink || lastSnap.captureUrl || null,
          },
        });
      });
      if (list.length > 0) {
        // 정렬: 교대 우선, 과기원 그룹
        const order = [
          '경인교대', '공주교대', '광주교대', '대구교대', '부산교대',
          '서울교대', '전주교대', '진주교대', '청주교대', '춘천교대', '한국교원대',
          'DGIST', 'GIST', 'KAIST', 'KENTECH', 'POSTECH', 'UNIST'
        ];
        list.sort((a, b) => {
          const idxA = order.indexOf(a.key);
          const idxB = order.indexOf(b.key);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.key.localeCompare(b.key);
        });
        setUniversities(list);
      }
    } catch (e) {
      console.error('Firestore fallback failed:', e);
    }
  };

  useEffect(() => {
    fetchStatusAndUnivs();
    const interval = setInterval(fetchStatusAndUnivs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUniv = (key: string) => {
    setSelectedUnivKey(key);
    setCurrentTab('detail');
  };

  const handlePreviewCapture = (url: string, title: string) => {
    setPreviewImage({ url, title });
  };

  const handleQuickCollect = async () => {
    try {
      await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: true }),
      });
      fetchStatusAndUnivs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'detail') setSelectedUnivKey(null);
        }}
        isCollecting={isCollecting}
        serverTime={serverTime}
        onRefresh={fetchStatusAndUnivs}
        onOpenDrive={() => {
          setDriveTargetUrl('https://drive.google.com/drive/u/0/folders/1WmHB5_EqiZklq6kRnMXDn_kfbNXAD61j');
          setIsDriveModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardPage
            universities={universities}
            onSelectUniv={handleSelectUniv}
            onPreviewCapture={handlePreviewCapture}
            onQuickCollect={handleQuickCollect}
            isCollecting={isCollecting}
          />
        )}

        {currentTab === 'detail' && selectedUnivKey && (
          <UniversityDetailPage
            univKey={selectedUnivKey}
            onBack={() => {
              setSelectedUnivKey(null);
              setCurrentTab('dashboard');
            }}
            onPreviewCapture={handlePreviewCapture}
          />
        )}

        {currentTab === 'manual' && (
          <ManualCollectPage
            universities={universities}
            defaultLabel={defaultLabel}
            isCollecting={isCollecting}
            onRefresh={fetchStatusAndUnivs}
          />
        )}

        {currentTab === 'reports' && <ReportsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>2027학년도 수시모집 교대 경쟁률 취합 자동화 시스템 • 정보분석3팀</p>
      </footer>

      {/* Capture Preview Modal */}
      <CaptureModal
        imageUrl={previewImage?.url || null}
        title={previewImage?.title || ''}
        onClose={() => setPreviewImage(null)}
      />

      {/* Google Drive Password Protected Modal (Password: 1004) */}
      <PasswordModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSuccess={() => setIsDriveModalOpen(false)}
        targetUrl={driveTargetUrl}
        title="구글 드라이브 보안 접속"
      />
    </div>
  );
};

export default App;
