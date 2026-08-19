'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, checkRedirectResult } from '@/lib/auth';
import { LogIn, Mail, Globe } from 'lucide-react';
import styles from './page.module.css';

function formatAuthError(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const errorObj = err as { code?: string; message?: string };
  const code = errorObj.code || '';
  const message = errorObj.message || '';

  // Suppress benign user cancellations
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('popup-closed-by-user') ||
    message.includes('cancelled-popup-request')
  ) {
    return '';
  }

  // Friendly human-readable messages for known error codes
  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by your browser. Please allow popups or try again.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain is not authorized in Firebase Console for Google sign-in.';
  }

  // Clean message: strip technical prefix without removing the actual reason
  const cleanMsg = message
    .replace(/^Firebase:\s*/i, '')
    .replace(/^Error\s*\((auth\/[^)]+)\):\s*/i, '$1: ')
    .trim();

  return cleanMsg || 'Authentication failed. Please try again.';
}

export default function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if returning from a Google redirect sign-in flow
  useEffect(() => {
    checkRedirectResult().catch(err => {
      console.error('Redirect sign-in check error:', err);
    });
  }, []);

  // If already logged in, show a simple redirect message
  if (user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loggedInText}>
            You&apos;re signed in as <strong>{user.displayName || user.email}</strong>
          </p>
          <p className={styles.loggedInSub}>Head to Settings to manage your account and sync.</p>
        </div>
      </div>
    );
  }

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logoWrapper}>
          <div className={styles.ambientGlow} />
          <Image
            src="/icon.svg"
            alt="Tsugi(t) Logo"
            className={styles.logoSvg}
            width={76}
            height={76}
            priority
          />
        </div>
        <h1 className={styles.heroTitle}>Tsugi(t)</h1>
        <p className={styles.heroSub}>Sign in to sync your data across devices</p>
      </div>

      <div className={styles.card}>
        {/* Google Sign-In */}
        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={loading}
          id="google-sign-in"
        >
          <Globe size={20} />
          Continue with Google
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className={styles.form}>
          <input
            type="email"
            className={styles.input}
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            id="auth-email"
          />
          <input
            type="password"
            className={styles.input}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            id="auth-password"
          />

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            id="auth-submit"
          >
            {loading ? (
              'Please wait...'
            ) : (
              <>
                <LogIn size={18} />
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <p className={styles.switchMode}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            className={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            id="auth-switch-mode"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>

      <p className={styles.skipText}>
        <Mail size={14} />
        You can use Tsugi(t) without signing in — your data stays on this device.
      </p>
    </div>
  );
}
