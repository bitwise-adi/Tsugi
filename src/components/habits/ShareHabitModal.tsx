'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createShareCode, getMyShares, revokeShare } from '@/lib/sharing';
import { Copy, Check, Share2, UserMinus, Loader2, Link2 } from 'lucide-react';
import type { Habit, HabitShare } from '@/types';
import styles from './ShareHabitModal.module.css';

interface ShareHabitModalProps {
  habit: Habit;
  onClose: () => void;
}

export default function ShareHabitModal({ habit, onClose }: ShareHabitModalProps) {
  const { user } = useAuth();
  const [shares, setShares] = useState<HabitShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const myShares = await getMyShares(user.uid, habit.id);
      setShares(myShares);
    } catch (err) {
      console.error('Failed to load shares:', err);
    } finally {
      setLoading(false);
    }
  }, [user, habit.id]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const activeShare = shares.find(s => s.status === 'active');

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const share = await createShareCode(
        user.uid,
        user.displayName || user.email || 'Anonymous',
        habit
      );
      setShares(prev => [...prev.filter(s => s.id !== share.id), share]);
    } catch (err) {
      console.error('Failed to generate share code:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!activeShare) return;
    try {
      await navigator.clipboard.writeText(activeShare.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + copy
      const input = document.createElement('input');
      input.value = activeShare.shareCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async (shareId: string) => {
    setRevoking(shareId);
    try {
      const share = shares.find(s => s.id === shareId);
      await revokeShare(shareId, share?.ownerUserId || '', share?.sharedWithUserId);
      setShares(prev => prev.map(s => s.id === shareId ? { ...s, status: 'revoked' } : s));
    } catch (err) {
      console.error('Failed to revoke share:', err);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <Share2 size={20} className={styles.modalIcon} />
            <h2 className={styles.modalTitle}>Share Habit</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className={styles.modalDesc}>
          Share <strong>{habit.title}</strong> with someone. They&apos;ll see your progress read-only — no editing.
        </p>

        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {/* Share Code Section */}
            {activeShare ? (
              <div className={styles.shareCodeSection}>
                <label className={styles.codeLabel}>Share Code</label>
                <div className={styles.codeRow}>
                  <div className={styles.codeDisplay}>
                    <Link2 size={16} className={styles.codeLinkIcon} />
                    <span className={styles.codeText}>{activeShare.shareCode}</span>
                  </div>
                  <button
                    className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                    onClick={handleCopy}
                    id="copy-share-code"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className={styles.codeHint}>
                  Give this code to someone — they can enter it in their &quot;Shared&quot; tab to see your progress.
                </p>

                {/* Shared With */}
                {activeShare.sharedWithUserId && (
                  <div className={styles.sharedWith}>
                    <div className={styles.sharedWithInfo}>
                      <span className={styles.sharedWithLabel}>Shared with</span>
                      <span className={styles.sharedWithName}>
                        {activeShare.sharedWithDisplayName || 'Someone'}
                      </span>
                    </div>
                    <button
                      className={styles.revokeBtn}
                      onClick={() => handleRevoke(activeShare.id)}
                      disabled={revoking === activeShare.id}
                      id="revoke-share-btn"
                    >
                      {revoking === activeShare.id ? (
                        <Loader2 size={14} className={styles.spinner} />
                      ) : (
                        <UserMinus size={14} />
                      )}
                      Revoke
                    </button>
                  </div>
                )}

                {!activeShare.sharedWithUserId && (
                  <div className={styles.pendingBadge}>
                    Waiting for someone to claim this code...
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.generateSection}>
                <button
                  className={styles.generateBtn}
                  onClick={handleGenerate}
                  disabled={generating}
                  id="generate-share-code"
                >
                  {generating ? (
                    <Loader2 size={18} className={styles.spinner} />
                  ) : (
                    <Link2 size={18} />
                  )}
                  {generating ? 'Generating...' : 'Generate Share Code'}
                </button>
              </div>
            )}

            {/* Revoked Shares History */}
            {shares.filter(s => s.status === 'revoked').length > 0 && (
              <div className={styles.historySection}>
                <span className={styles.historyLabel}>Previous shares</span>
                {shares.filter(s => s.status === 'revoked').map(s => (
                  <div key={s.id} className={styles.historyItem}>
                    <span className={styles.historyCode}>{s.shareCode}</span>
                    <span className={styles.historyStatus}>Revoked</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
