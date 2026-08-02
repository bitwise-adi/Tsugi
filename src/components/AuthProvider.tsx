'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, signOut } from '@/lib/auth';
import { syncData } from '@/lib/sync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncing: boolean;
  logout: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const triggerSync = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncData(user.uid);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Auto-sync on login
      if (firebaseUser) {
        setSyncing(true);
        try {
          await syncData(firebaseUser.uid);
        } catch (err) {
          console.error('Auto-sync failed:', err);
        } finally {
          setSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, syncing, logout, triggerSync }}>
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
