import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyClQdRIlbNJMy8qyQacFqqRJoNPSj23jo8",
  authDomain: "school-schedule-ad811.firebaseapp.com",
  projectId: "school-schedule-ad811",
  storageBucket: "school-schedule-ad811.firebasestorage.app",
  messagingSenderId: "789522158878",
  appId: "1:789522158878:web:7836bf982b8d7c7f44250f",
  measurementId: "G-MMYWTW8YWB"
};

const app = !getApps().length ? initializeApp(DEFAULT_FIREBASE_CONFIG) : getApps()[0];
export const db = getFirestore(app);
export { collection, getDocs, doc, getDoc, onSnapshot };
