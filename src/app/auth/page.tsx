'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, checkRedirectResult } from '@/lib/auth';
import { LogIn, Mail, Globe } from 'lucide-react';
import styles from './page.module.css';

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
      console.error('Redirect sign-in check failed:', err);
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
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      // Suppress benign user cancellation
      if (msg.includes('popup-closed-by-user') || msg.includes('cancelled-popup-request')) {
        setError('');
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
      }
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
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logoIcon}>✓</div>
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
