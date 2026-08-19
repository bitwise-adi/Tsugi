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

// Initialize Firebase App (prevent duplicate app initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Prioritize browserLocalPersistence (localStorage) so mobile background tab suspension
// cannot close IndexedDB and cause "Database is closing/hidden" errors.
let authInstance: Auth;
if (typeof window !== 'undefined') {
  try {
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence],
    });
  } catch {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const firestore = getFirestore(app);
export default app;
