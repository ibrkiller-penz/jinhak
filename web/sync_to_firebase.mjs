import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: "AIzaSyClQdRIlbNJMy8qyQacFqqRJoNPSj23jo8",
  authDomain: "school-schedule-ad811.firebaseapp.com",
  projectId: "school-schedule-ad811",
  storageBucket: "school-schedule-ad811.firebasestorage.app",
  messagingSenderId: "789522158878",
  appId: "1:789522158878:web:7836bf982b8d7c7f44250f",
  measurementId: "G-MMYWTW8YWB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sync() {
  console.log("Syncing universities to Firestore (school-schedule-ad811)...");
  const localDataDir = path.resolve(__dirname, '../out/firestore_data');
  
  if (!fs.existsSync(localDataDir)) {
    console.log("No local data dir found.");
    return;
  }

  const metaFiles = fs.readdirSync(localDataDir).filter(f => f.endsWith('_meta.json'));
  for (const mf of metaFiles) {
    const univKey = mf.replace('_meta.json', '');
    const metaPath = path.join(localDataDir, mf);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    
    // Check snapshots
    const snapDir = path.join(localDataDir, univKey, 'snapshots');
    let lastSnap = null;
    if (fs.existsSync(snapDir)) {
      const snapFiles = fs.readdirSync(snapDir).filter(f => f.endsWith('.json')).sort();
      if (snapFiles.length > 0) {
        const latestFile = snapFiles[snapFiles.length - 1];
        lastSnap = JSON.parse(fs.readFileSync(path.join(snapDir, latestFile), 'utf8'));
      }
    }

    const docData = {
      ...meta,
      lastSnapshot: lastSnap ? {
        label: lastSnap.label,
        capturedAt: lastSnap.capturedAt,
        status: lastSnap.status,
        notice: lastSnap.notice,
        mojip: lastSnap.summary ? lastSnap.summary.mojip : 0,
        jiwon: lastSnap.summary ? lastSnap.summary.jiwon : 0,
        ratio: lastSnap.summary ? lastSnap.summary.ratio : "-",
      } : null
    };

    console.log(`Writing ${univKey} -> Firestore...`);
    await setDoc(doc(db, '교대경쟁률', univKey), docData, { merge: true });
  }

  console.log("✅ All universities synchronized to Firestore!");
  process.exit(0);
}

sync().catch(err => {
  console.error("Sync error:", err);
  process.exit(1);
});
