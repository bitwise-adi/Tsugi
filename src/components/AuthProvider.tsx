'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signOut } from '@/lib/auth';
import { syncData, getPendingOutboxCount, flushOutbox } from '@/lib/sync';
import type { SyncStatus } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  pendingOutboxCount: number;
  logout: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);

  const syncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refreshOutboxCount = useCallback(async () => {
    try {
      const count = await getPendingOutboxCount();
      setPendingOutboxCount(count);
      setSyncStatus(prev => {
        if (count > 0 && !syncingRef.current) return 'pending';
        if (count === 0 && !syncingRef.current && prev !== 'error') return 'synced';
        return prev;
      });
    } catch {
      // Ignore count errors
    }
  }, []);

  const runSync = useCallback(async (isFullSync = false) => {
    const currentUser = userRef.current;
    if (!currentUser || syncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('pending');
      return;
    }

    syncingRef.current = true;
    setSyncStatus('syncing');

    try {
      if (isFullSync) {
        await syncData(currentUser.uid);
      } else {
        await flushOutbox(currentUser.uid);
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      lastSyncTimeRef.current = Date.now();
    } catch (err) {
      console.error('Background sync failed:', err);
      setSyncStatus('error');
    } finally {
      syncingRef.current = false;
      const count = await getPendingOutboxCount();
      setPendingOutboxCount(count);
      setSyncStatus(prev => {
        if (count > 0 && prev !== 'error') return 'pending';
        if (count === 0 && prev !== 'error') return 'synced';
        return prev;
      });
    }
  }, []);

  const triggerSync = useCallback(async () => {
    await runSync(true);
  }, [runSync]);

  useEffect(() => {
    let active = true;
    getPendingOutboxCount().then((count) => {
      if (!active) return;
      setPendingOutboxCount(count);
      setSyncStatus(prev => {
        if (count > 0 && !syncingRef.current) return 'pending';
        return prev;
      });
    });

    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        runSync(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [runSync]);

  // Outbox and Sync event listeners
  useEffect(() => {
    const handleOutboxChanged = () => {
      refreshOutboxCount();
    };

    const handleSyncRequested = () => {
      runSync(false);
    };

    const handleOnline = () => {
      if (userRef.current) {
        runSync(true);
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        userRef.current &&
        Date.now() - lastSyncTimeRef.current > 60_000 // Throttled to max 1 sync per 60s
      ) {
        runSync(false);
      }
    };

    window.addEventListener('tsugi:outbox-changed', handleOutboxChanged);
    window.addEventListener('tsugi:sync-requested', handleSyncRequested);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic sync every 5 minutes if online and logged in
    const interval = setInterval(() => {
      if (userRef.current && typeof navigator !== 'undefined' && navigator.onLine) {
        runSync(false);
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('tsugi:outbox-changed', handleOutboxChanged);
      window.removeEventListener('tsugi:sync-requested', handleSyncRequested);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshOutboxCount, runSync]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncing: syncStatus === 'syncing',
        syncStatus,
        lastSyncedAt,
        pendingOutboxCount,
        logout,
        triggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
