'use client';

import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/components/AuthProvider';
import { Sun, Moon, Monitor, Palette, Bell, BellOff, Download, User, LogOut, RefreshCw, Database } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/notifications';
import { exportAsJSON, exportAsCSV } from '@/lib/export';
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
  const {
    user,
    loading: authLoading,
    syncing,
    syncStatus,
    lastSyncedAt,
    pendingOutboxCount,
    logout,
    triggerSync,
  } = useAuth();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(() => {
    return typeof window !== 'undefined' ? getNotificationPermission() : null;
  });
  const [exporting, setExporting] = useState(false);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  const handleExport = async (type: 'json' | 'csv') => {
    setExporting(true);
    try {
      if (type === 'json') await exportAsJSON();
      else await exportAsCSV();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      {/* Account Section */}
      {!authLoading && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <User size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Account &amp; Sync</h2>
          </div>
          {user ? (
            <div className={styles.accountCard}>
              <div className={styles.accountInfo}>
                <div className={styles.avatar}>
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt="" className={styles.avatarImg} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div className={styles.accountDetails}>
                  <p className={styles.accountName}>{user.displayName || 'User'}</p>
                  <p className={styles.accountEmail}>{user.email}</p>
                </div>
              </div>

              {/* Sync Status Banner */}
              <div className={styles.syncStatusBanner}>
                <div className={styles.syncStatusIndicator}>
                  <span
                    className={`${styles.syncDot} ${
                      syncStatus === 'synced'
                        ? styles.syncDotGreen
                        : syncStatus === 'syncing'
                        ? styles.syncDotBlue
                        : syncStatus === 'pending'
                        ? styles.syncDotAmber
                        : styles.syncDotRed
                    }`}
                  />
                  <span className={styles.syncStatusLabel}>
                    {syncStatus === 'synced'
                      ? 'Saved locally & synced with cloud'
                      : syncStatus === 'syncing'
                      ? 'Syncing changes...'
                      : syncStatus === 'pending'
                      ? `${pendingOutboxCount} change${pendingOutboxCount !== 1 ? 's' : ''} queued offline`
                      : 'Sync failed (will auto-retry)'}
                  </span>
                </div>
                {lastSyncedAt && syncStatus === 'synced' && (
                  <span className={styles.lastSyncTime}>
                    Last synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className={styles.accountActions}>
                <button
                  className={styles.syncBtn}
                  onClick={triggerSync}
                  disabled={syncing}
                  id="sync-now-btn"
                >
                  <RefreshCw size={16} className={syncing ? styles.spinning : ''} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button className={styles.logoutBtn} onClick={logout} id="sign-out-btn">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.accountCard}>
              <div className={styles.syncStatusBanner}>
                <div className={styles.syncStatusIndicator}>
                  <span className={`${styles.syncDot} ${styles.syncDotGreen}`} />
                  <span className={styles.syncStatusLabel}>Local-First Storage Active</span>
                </div>
              </div>
              <p className={styles.notSignedIn}>
                Not signed in — all your habits and tasks are saved securely on this device in IndexedDB.
              </p>
              <a href="/auth" className={styles.signInLink}>Sign in to sync across devices &rarr;</a>
            </div>
          )}
        </section>
      )}

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

      {/* Notifications */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Bell size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Notifications</h2>
        </div>
        <p className={styles.sectionDesc}>Get reminded about your tasks</p>
        <div className={styles.notifCard}>
          {notifPermission === 'granted' ? (
            <div className={styles.notifStatus}>
              <Bell size={18} className={styles.notifIconOn} />
              <div>
                <p className={styles.notifStatusText}>Notifications enabled</p>
                <p className={styles.notifStatusSub}>You&apos;ll get reminders for tasks with times set</p>
              </div>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className={styles.notifStatus}>
              <BellOff size={18} className={styles.notifIconOff} />
              <div>
                <p className={styles.notifStatusText}>Notifications blocked</p>
                <p className={styles.notifStatusSub}>Enable them in your browser settings</p>
              </div>
            </div>
          ) : (
            <button
              className={styles.notifEnableBtn}
              onClick={handleEnableNotifications}
              id="enable-notifications-btn"
            >
              <Bell size={18} />
              Enable Notifications
            </button>
          )}
        </div>
      </section>

      {/* Data Management */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Data Management</h2>
        </div>
        <p className={styles.sectionDesc}>Export your data for backup or analysis</p>
        <div className={styles.exportGrid}>
          <button
            className={styles.exportBtn}
            onClick={() => handleExport('json')}
            disabled={exporting}
            id="export-json-btn"
          >
            <Download size={18} />
            <div>
              <p className={styles.exportBtnTitle}>Export as JSON</p>
              <p className={styles.exportBtnSub}>Full backup, importable later</p>
            </div>
          </button>
          <button
            className={styles.exportBtn}
            onClick={() => handleExport('csv')}
            disabled={exporting}
            id="export-csv-btn"
          >
            <Download size={18} />
            <div>
              <p className={styles.exportBtnTitle}>Export as CSV</p>
              <p className={styles.exportBtnSub}>Spreadsheet-friendly format</p>
            </div>
          </button>
        </div>
      </section>

      {/* About */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>About</h2>
        </div>
        <div className={styles.aboutCard}>
          <p className={styles.appName}>Tsugi(t)</p>
          <p className={styles.appVersion}>Version 1.0.0</p>
          <p className={styles.aboutText}>
            A habit tracker &amp; task manager built on the philosophy of continuous mending (Tsugi) as a function of time (t).
          </p>
        </div>
      </section>
    </div>
  );
}
