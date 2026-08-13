'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Habit, HabitEntry, HabitShare } from '@/types';

// Generate a short alphanumeric share code
function generateShareCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars (0/O, 1/l/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a share code for a habit. Returns the HabitShare document.
 */
export async function createShareCode(
  userId: string,
  userDisplayName: string,
  habit: Habit
): Promise<HabitShare> {
  // Check if an active share already exists for this habit
  const existing = await getMyShares(userId, habit.id);
  const activeShare = existing.find(s => s.status === 'active');
  if (activeShare) {
    return activeShare;
  }

  const shareCode = generateShareCode();
  const shareId = `share_${shareCode}`;

  const shareDoc: HabitShare = {
    id: shareId,
    shareCode,
    ownerUserId: userId,
    ownerDisplayName: userDisplayName,
    habitId: habit.id,
    habitTitle: habit.title,
    habitColor: habit.color,
    createdAt: new Date().toISOString(),
    status: 'active',
  };

  await setDoc(doc(firestore, 'habitShares', shareId), shareDoc);
  return shareDoc;
}

/**
 * Claim a share code — sets the recipient user ID on the share doc.
 */
export async function claimShareCode(
  userId: string,
  userDisplayName: string,
  shareCode: string
): Promise<{ success: boolean; share?: HabitShare; error?: string }> {
  // Look up the share by code
  const q = query(
    collection(firestore, 'habitShares'),
    where('shareCode', '==', shareCode.toLowerCase().trim()),
    where('status', '==', 'active')
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    return { success: false, error: 'Invalid or expired share code.' };
  }

  const shareDoc = snap.docs[0];
  const share = shareDoc.data() as HabitShare;

  // Can't claim your own share
  if (share.ownerUserId === userId) {
    return { success: false, error: 'You cannot claim your own share code.' };
  }

  // Already claimed by someone
  if (share.sharedWithUserId && share.sharedWithUserId !== userId) {
    return { success: false, error: 'This share code has already been claimed.' };
  }

  // Already claimed by this user
  if (share.sharedWithUserId === userId) {
    return { success: true, share };
  }

  // Claim it
  await updateDoc(doc(firestore, 'habitShares', share.id), {
    sharedWithUserId: userId,
    sharedWithDisplayName: userDisplayName,
  });

  // Write access mirror doc so Firestore rules can verify read access
  await setDoc(
    doc(firestore, 'users', share.ownerUserId, 'sharedWith', userId),
    { grantedAt: new Date().toISOString(), habitId: share.habitId }
  );

  return {
    success: true,
    share: { ...share, sharedWithUserId: userId, sharedWithDisplayName: userDisplayName },
  };
}

/**
 * Get all active habits shared WITH this user.
 */
export async function getSharedWithMe(userId: string): Promise<HabitShare[]> {
  const q = query(
    collection(firestore, 'habitShares'),
    where('sharedWithUserId', '==', userId),
    where('status', '==', 'active')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as HabitShare);
}

/**
 * Get all active shares created BY this user (habits they shared out to others).
 */
export async function getSharedByMe(userId: string): Promise<HabitShare[]> {
  const q = query(
    collection(firestore, 'habitShares'),
    where('ownerUserId', '==', userId),
    where('status', '==', 'active')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as HabitShare);
}

/**
 * Get shares the user has created for a specific habit.
 */
export async function getMyShares(userId: string, habitId: string): Promise<HabitShare[]> {
  const q = query(
    collection(firestore, 'habitShares'),
    where('ownerUserId', '==', userId),
    where('habitId', '==', habitId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as HabitShare);
}

/**
 * Revoke a share — sets status to 'revoked' and removes the access mirror doc.
 */
export async function revokeShare(
  shareId: string,
  ownerUserId: string,
  sharedWithUserId?: string
): Promise<void> {
  await updateDoc(doc(firestore, 'habitShares', shareId), {
    status: 'revoked',
  });

  // Remove access mirror doc to revoke Firestore-level read access
  if (sharedWithUserId) {
    await deleteDoc(
      doc(firestore, 'users', ownerUserId, 'sharedWith', sharedWithUserId)
    );
  }
}

/**
 * Fetch shared habit data (the habit itself) from the owner's Firestore subcollection.
 */
export async function getSharedHabitData(
  ownerUserId: string,
  habitId: string
): Promise<Habit | null> {
  const ref = doc(firestore, 'users', ownerUserId, 'habits', habitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _uid, ...habit } = data as Habit & { userId?: string };
  return habit;
}

/**
 * Fetch shared habit entries from the owner's Firestore subcollection.
 */
export async function getSharedHabitEntries(
  ownerUserId: string,
  habitId: string
): Promise<HabitEntry[]> {
  const q = query(
    collection(firestore, 'users', ownerUserId, 'habitEntries'),
    where('habitId', '==', habitId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _uid, ...entry } = data as HabitEntry & { userId?: string };
    return entry;
  });
}
