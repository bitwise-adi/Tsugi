import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQLZQ7MY-CNZ-ANLefMsnyxrqFmrj1L64",
  authDomain: "locome-8a3b6.firebaseapp.com",
  projectId: "locome-8a3b6",
  storageBucket: "locome-8a3b6.firebasestorage.app",
  messagingSenderId: "706318116292",
  appId: "1:706318116292:web:5d5adc83ce9b8edbe73091"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use localStorage persistence in browser to avoid IndexedDB closing/hidden errors on mobile
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase setPersistence notice (ignored):', err);
  });
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firestore = getFirestore(app);
export default app;
