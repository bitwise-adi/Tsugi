'use client';

import { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import type { AccentColor, ThemeMode } from '@/types';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  accentColor: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'tsugit-theme';
const ACCENT_KEY = 'tsugit-accent';

const emptySubscribe = () => () => {};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem(THEME_KEY) || localStorage.getItem('locome-theme')) as ThemeMode | null;
      return savedTheme || 'dark';
    }
    return 'dark';
  });
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      const savedAccent = (localStorage.getItem(ACCENT_KEY) || localStorage.getItem('locome-accent')) as AccentColor | null;
      return savedAccent || 'purple';
    }
    return 'purple';
  });
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — not critical
      });
    }
  }, []);

  const resolvedTheme = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  // Apply theme to <html>
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [resolvedTheme, accentColor, mounted]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem(ACCENT_KEY, color);
  }, []);

  // Default context value used before mount (prevents SSR crash)
  const defaultValue: ThemeContextType = {
    theme,
    resolvedTheme,
    accentColor,
    setTheme,
    setAccentColor,
  };

  // Prevent flash of wrong theme — always provide context so useTheme works
  if (!mounted) {
    return (
      <ThemeContext.Provider value={defaultValue}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, setTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
