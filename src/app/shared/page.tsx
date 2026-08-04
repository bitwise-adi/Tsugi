'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getSharedWithMe, claimShareCode, getSharedHabitData, getSharedHabitEntries } from '@/lib/sharing';
import SharedHabitView from '@/components/habits/SharedHabitView';
import { Users, Link2, Loader2, ArrowRight, LogIn, Eye } from 'lucide-react';
import type { Habit, HabitEntry, HabitShare } from '@/types';
import styles from './page.module.css';

export default function SharedPage() {
  const { user, loading: authLoading } = useAuth();
  const [shares, setShares] = useState<HabitShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // View state for reading a shared habit
  const [viewingShare, setViewingShare] = useState<HabitShare | null>(null);
  const [viewHabit, setViewHabit] = useState<Habit | null>(null);
  const [viewEntries, setViewEntries] = useState<HabitEntry[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const loadShares = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const shared = await getSharedWithMe(user.uid);
      setShares(shared);
    } catch (err) {
      console.error('Failed to load shared habits:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadShares();
    } else {
      setLoading(false);
    }
  }, [user, loadShares]);

  const handleClaim = async () => {
    if (!user || !codeInput.trim()) return;
    setClaiming(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      const result = await claimShareCode(
        user.uid,
        user.displayName || user.email || 'Anonymous',
        codeInput.trim()
      );

      if (result.success && result.share) {
        setClaimSuccess(`Added "${result.share.habitTitle}" from ${result.share.ownerDisplayName}!`);
        setCodeInput('');
        loadShares();
      } else {
        setClaimError(result.error || 'Failed to claim share code.');
      }
    } catch (err) {
      console.error('Claim error:', err);
      setClaimError('Something went wrong. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleViewHabit = async (share: HabitShare) => {
    setViewLoading(true);
    setViewingShare(share);

    try {
      const [habit, entries] = await Promise.all([
        getSharedHabitData(share.ownerUserId, share.habitId),
        getSharedHabitEntries(share.ownerUserId, share.habitId),
      ]);

      if (habit) {
        setViewHabit(habit);
        setViewEntries(entries);
      }
    } catch (err) {
      console.error('Failed to load shared habit:', err);
    } finally {
      setViewLoading(false);
    }
  };

  // If viewing a shared habit
  if (viewingShare && viewHabit) {
    return (
      <SharedHabitView
        habit={viewHabit}
        entries={viewEntries}
        ownerName={viewingShare.ownerDisplayName}
        onBack={() => {
          setViewingShare(null);
          setViewHabit(null);
          setViewEntries([]);
        }}
      />
    );
  }

  // Loading shared habit data
  if (viewLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingPulse} />
          <p>Loading shared habit...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <Users size={28} className={styles.titleIcon} />
              Shared
            </h1>
            <p className={styles.subtitle}>View habits shared with you</p>
          </div>
        </header>
        <div className={styles.authRequired}>
          <LogIn size={40} className={styles.authIcon} />
          <h2 className={styles.authTitle}>Login Required</h2>
          <p className={styles.authText}>
            You need to be signed in to view shared habits. Head to Settings to log in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Users size={28} className={styles.titleIcon} />
            Shared
          </h1>
          <p className={styles.subtitle}>
            {shares.length === 0
              ? 'No shared habits yet'
              : `${shares.length} habit${shares.length !== 1 ? 's' : ''} shared with you`}
          </p>
        </div>
      </header>

      {/* Claim Code Input */}
      <div className={styles.claimSection}>
        <label className={styles.claimLabel}>
          <Link2 size={14} />
          Enter a share code
        </label>
        <div className={styles.claimRow}>
          <input
            className={styles.claimInput}
            type="text"
            placeholder="e.g. a3k9x2"
            value={codeInput}
            onChange={e => {
              setCodeInput(e.target.value);
              setClaimError('');
              setClaimSuccess('');
            }}
            maxLength={6}
            id="share-code-input"
          />
          <button
            className={styles.claimBtn}
            onClick={handleClaim}
            disabled={claiming || !codeInput.trim()}
            id="claim-share-btn"
          >
            {claiming ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <ArrowRight size={16} />
            )}
            {claiming ? 'Adding...' : 'Add'}
          </button>
        </div>
        {claimError && <p className={styles.claimError}>{claimError}</p>}
        {claimSuccess && <p className={styles.claimSuccess}>{claimSuccess}</p>}
      </div>

      {/* Shared Habits List */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingPulse} />
          <p>Loading shared habits...</p>
        </div>
      ) : shares.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👀</div>
          <h2 className={styles.emptyTitle}>No shared habits</h2>
          <p className={styles.emptyText}>
            When someone shares a habit with you, enter their share code above to see their progress!
          </p>
        </div>
      ) : (
        <div className={styles.shareList}>
          {shares.map((share, index) => (
            <button
              key={share.id}
              className={styles.shareCard}
              onClick={() => handleViewHabit(share)}
              style={{ animationDelay: `${index * 60}ms` }}
              id={`shared-habit-${share.id}`}
            >
              <div
                className={styles.shareCardDot}
                style={{ background: share.habitColor }}
              />
              <div className={styles.shareCardInfo}>
                <span className={styles.shareCardTitle}>{share.habitTitle}</span>
                <span className={styles.shareCardOwner}>
                  by {share.ownerDisplayName}
                </span>
              </div>
              <div className={styles.shareCardAction}>
                <Eye size={16} />
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
