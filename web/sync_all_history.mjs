import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyClQdRIlbNJMy8qyQacFqqRJoNPSj23jo8',
  authDomain: 'school-schedule-ad811.firebaseapp.com',
  projectId: 'school-schedule-ad811',
  storageBucket: 'school-schedule-ad811.firebasestorage.app',
  messagingSenderId: '789522158878',
  appId: '1:789522158878:web:7836bf982b8d7c7f44250f',
};

const app = initializeApp(config);
const db = getFirestore(app);

const baseDir = path.resolve('out/firestore_data');

async function syncAll() {
  if (!fs.existsSync(baseDir)) {
    console.log('No out/firestore_data directory found.');
    return;
  }
  const items = fs.readdirSync(baseDir);
  for (const item of items) {
    if (item.endsWith('_meta.json')) {
      const univKey = item.replace('_meta.json', '');
      const meta = JSON.parse(fs.readFileSync(path.join(baseDir, item), 'utf8'));
      
      const snapDir = path.join(baseDir, univKey, 'snapshots');
      let snapCount = 0;
      let lastSnap = null;
      if (fs.existsSync(snapDir)) {
        const snapFiles = fs.readdirSync(snapDir).filter(f => f.endsWith('.json')).sort();
        snapCount = snapFiles.length;
        for (const sf of snapFiles) {
          const docId = sf.replace('.json', '');
          const snapData = JSON.parse(fs.readFileSync(path.join(snapDir, sf), 'utf8'));
          
          const cleanSnap = {
            label: snapData.label,
            capturedAt: snapData.capturedAt,
            status: snapData.status || 'ok',
            errorMessage: snapData.errorMessage || null,
            notice: snapData.notice || null,
            summary: snapData.summary || {},
            tablesJson: snapData.tablesJson || JSON.stringify(snapData.tables || []),
            screenshot: snapData.screenshot || {},
            backdata: snapData.backdata || {},
          };

          await setDoc(doc(db, '교대경쟁률', univKey, 'snapshots', docId), cleanSnap);
          lastSnap = cleanSnap;
        }
      }
      
      const docData = {
        ...meta,
        snapshotCount: snapCount,
        lastSnapshot: lastSnap ? {
          label: lastSnap.label,
          capturedAt: lastSnap.capturedAt,
          summary: lastSnap.summary,
          status: lastSnap.status,
          ratio: lastSnap.summary?.ratio || '-',
          mojip: lastSnap.summary?.mojip || 0,
          jiwon: lastSnap.summary?.jiwon || 0,
        } : {
          label: '09월11일14시',
          capturedAt: new Date().toISOString(),
          status: meta.ratioUrl ? 'ok' : 'pre',
          ratio: '-',
          mojip: 0,
          jiwon: 0,
        }
      };

      await setDoc(doc(db, '교대경쟁률', univKey), docData, { merge: true });
      console.log('✅ Synced:', univKey, 'Snapshots:', snapCount, 'Ratio:', docData.lastSnapshot?.ratio);
    }
  }
  console.log('🎉 All Historical Snapshots Synced to Firestore!');
}

syncAll().catch(e => { console.error(e); process.exit(1); });
