import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQLZQ7MY-CNZ-ANLefMsnyxrqFmrj1L64",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "locome-8a3b6.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "locome-8a3b6",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "locome-8a3b6.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "706318116292",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:706318116292:web:5d5adc83ce9b8edbe73091",
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
