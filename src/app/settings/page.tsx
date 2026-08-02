'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import type { AccentColor, ThemeMode } from '@/types';
import styles from './page.module.css';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'purple', label: 'Purple', color: 'hsl(262, 80%, 58%)' },
  { value: 'blue', label: 'Blue', color: 'hsl(217, 91%, 60%)' },
  { value: 'teal', label: 'Teal', color: 'hsl(172, 66%, 50%)' },
  { value: 'rose', label: 'Rose', color: 'hsl(340, 82%, 60%)' },
  { value: 'amber', label: 'Amber', color: 'hsl(38, 92%, 55%)' },
  { value: 'emerald', label: 'Emerald', color: 'hsl(160, 84%, 39%)' },
];

export default function SettingsPage() {
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      {/* Theme Mode */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Sun size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Appearance</h2>
        </div>
        <p className={styles.sectionDesc}>Choose your preferred theme mode</p>
        <div className={styles.themeGrid}>
          {THEME_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                className={`${styles.themeBtn} ${theme === opt.value ? styles.themeBtnActive : ''}`}
                onClick={() => setTheme(opt.value)}
                id={`theme-${opt.value}`}
              >
                <Icon size={20} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Color */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Palette size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Accent Color</h2>
        </div>
        <p className={styles.sectionDesc}>Personalize your app&apos;s accent color</p>
        <div className={styles.accentGrid}>
          {ACCENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.accentBtn} ${accentColor === opt.value ? styles.accentBtnActive : ''}`}
              onClick={() => setAccentColor(opt.value)}
              id={`accent-${opt.value}`}
            >
              <span className={styles.accentSwatch} style={{ background: opt.color }} />
              <span className={styles.accentLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* About */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>About</h2>
        </div>
        <div className={styles.aboutCard}>
          <p className={styles.appName}>TrackMe</p>
          <p className={styles.appVersion}>Version 1.0.0</p>
          <p className={styles.aboutText}>
            A habit tracker &amp; task manager built to help you build consistency and stay on top of your goals.
          </p>
        </div>
      </section>
    </div>
  );
}
