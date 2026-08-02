import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQLZQ7MY-CNZ-ANLefMsnyxrqFmrj1L64",
  authDomain: "locome-8a3b6.firebaseapp.com",
  projectId: "locome-8a3b6",
  storageBucket: "locome-8a3b6.firebasestorage.app",
  messagingSenderId: "706318116292",
  appId: "1:706318116292:web:5d5adc83ce9b8edbe73091"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const firestore = getFirestore(app);
export default app;
