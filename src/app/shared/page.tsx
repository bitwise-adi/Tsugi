'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getSharedWithMe,
  getSharedByMe,
  claimShareCode,
  revokeShare,
  getSharedHabitData,
  getSharedHabitEntries,
} from '@/lib/sharing';
import SharedHabitView from '@/components/habits/SharedHabitView';
import {
  Users,
  Link2,
  Loader2,
  ArrowRight,
  LogIn,
  Eye,
  Share2,
  Copy,
  Check,
  Trash2,
  UserCheck,
  Clock,
} from 'lucide-react';
import type { Habit, HabitEntry, HabitShare } from '@/types';
import styles from './page.module.css';

export default function SharedPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'with_me' | 'by_me'>('with_me');
  const [sharedWithMe, setSharedWithMe] = useState<HabitShare[]>([]);
  const [sharedByMe, setSharedByMe] = useState<HabitShare[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim Code State
  const [codeInput, setCodeInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

  // Copy Code State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // View state for reading a shared habit
  const [viewingShare, setViewingShare] = useState<HabitShare | null>(null);
  const [viewHabit, setViewHabit] = useState<Habit | null>(null);
  const [viewEntries, setViewEntries] = useState<HabitEntry[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const loadShares = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [withMe, byMe] = await Promise.all([
        getSharedWithMe(user.uid),
        getSharedByMe(user.uid),
      ]);
      setSharedWithMe(withMe);
      setSharedByMe(byMe);
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevoke = async (share: HabitShare) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to revoke the share code for "${share.habitTitle}"?`)) return;

    setRevokingId(share.id);
    try {
      await revokeShare(share.id, user.uid, share.sharedWithUserId);
      await loadShares();
    } catch (err) {
      console.error('Failed to revoke share:', err);
      alert('Failed to revoke share. Please try again.');
    } finally {
      setRevokingId(null);
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
            <p className={styles.subtitle}>View habits shared with you and manage your invites</p>
          </div>
        </header>
        <div className={styles.authRequired}>
          <LogIn size={40} className={styles.authIcon} />
          <h2 className={styles.authTitle}>Login Required</h2>
          <p className={styles.authText}>
            You need to be signed in to view and manage shared habits. Head to Settings to log in.
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
            Collaborate, track consistency, and share progress with accountability partners
          </p>
        </div>
      </header>

      {/* Segmented Control Tabs */}
      <div className={styles.tabSwitcher} role="tablist">
        <button
          className={`${styles.switchTab} ${activeTab === 'with_me' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('with_me')}
          role="tab"
          aria-selected={activeTab === 'with_me'}
          id="tab-shared-with-me"
        >
          <Users size={16} />
          <span>Shared with Me</span>
          <span className={styles.tabBadge}>{sharedWithMe.length}</span>
        </button>

        <button
          className={`${styles.switchTab} ${activeTab === 'by_me' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('by_me')}
          role="tab"
          aria-selected={activeTab === 'by_me'}
          id="tab-shared-by-me"
        >
          <Share2 size={16} />
          <span>Shared by Me</span>
          <span className={styles.tabBadge}>{sharedByMe.length}</span>
        </button>
      </div>

      {/* TAB 1: Shared With Me */}
      {activeTab === 'with_me' && (
        <>
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
          ) : sharedWithMe.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👀</div>
              <h2 className={styles.emptyTitle}>No habits shared with you</h2>
              <p className={styles.emptyText}>
                When a friend gives you their 6-character share code, enter it above to follow their streak and calendar!
              </p>
            </div>
          ) : (
            <div className={styles.shareList}>
              {sharedWithMe.map((share, index) => (
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
        </>
      )}

      {/* TAB 2: Shared By Me */}
      {activeTab === 'by_me' && (
        <>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingPulse} />
              <p>Loading your active shares...</p>
            </div>
          ) : sharedByMe.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🤝</div>
              <h2 className={styles.emptyTitle}>No shared habits yet</h2>
              <p className={styles.emptyText}>
                Want an accountability partner? Open any habit on your <strong>Habits</strong> tab and tap <strong>Share</strong> to generate an invite code.
              </p>
            </div>
          ) : (
            <div className={styles.shareList}>
              {sharedByMe.map((share, index) => (
                <div
                  key={share.id}
                  className={styles.myShareCard}
                  style={{ animationDelay: `${index * 60}ms` }}
                  id={`my-share-${share.id}`}
                >
                  <div className={styles.myShareHeader}>
                    <div className={styles.myShareTitleGroup}>
                      <div
                        className={styles.shareCardDot}
                        style={{ background: share.habitColor }}
                      />
                      <span className={styles.myShareHabitTitle}>{share.habitTitle}</span>
                    </div>

                    <button
                      className={styles.codeChip}
                      onClick={() => handleCopyCode(share.shareCode)}
                      title="Click to copy share code"
                      id={`copy-code-${share.id}`}
                    >
                      {copiedCode === share.shareCode ? (
                        <>
                          <Check size={12} color="var(--color-done)" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{share.shareCode}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className={styles.myShareFooter}>
                    {share.sharedWithDisplayName ? (
                      <span className={styles.statusBadgeClaimed}>
                        <UserCheck size={12} />
                        Claimed by {share.sharedWithDisplayName}
                      </span>
                    ) : (
                      <span className={styles.statusBadgeWaiting}>
                        <Clock size={12} />
                        Waiting for claim
                      </span>
                    )}

                    <button
                      className={styles.revokeBtn}
                      onClick={() => handleRevoke(share)}
                      disabled={revokingId === share.id}
                      id={`revoke-share-${share.id}`}
                    >
                      {revokingId === share.id ? (
                        <Loader2 size={12} className={styles.spinner} />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
