import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  type Auth,
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

// Initialize Auth with multi-layer persistence fallback
// (indexedDB -> localStorage -> sessionStorage) to prevent "Database is closing" error in mobile/background browsers
let authInstance: Auth;
try {
  if (typeof window !== 'undefined') {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    });
  } else {
    authInstance = getAuth(app);
  }
} catch {
  // If already initialized (e.g. during Fast Refresh / HMR), use existing instance
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firestore = getFirestore(app);
export default app;
