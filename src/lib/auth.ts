'use client';

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    const errCode = (err as { code?: string })?.code;
    const errMsg = (err as Error)?.message || '';

    // If popup is blocked or fails due to mobile browser restrictions / background database suspension,
    // fallback to seamless redirect flow
    if (
      errCode === 'auth/popup-blocked' ||
      errMsg.includes('closing') ||
      errMsg.includes('database') ||
      errMsg.includes('AbortError')
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw err;
  }
}

export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err) {
    console.error('Redirect sign-in error:', err);
    return null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
