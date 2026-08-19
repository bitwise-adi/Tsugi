'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './db';
import type { Habit, HabitEntry, Task, SyncOutboxItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Firestore does not accept 'undefined' for any field value.
// Strip undefined fields before writing to Firestore.
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// Get the count of pending outbox items
export async function getPendingOutboxCount(): Promise<number> {
  return await db.syncOutbox.count();
}

// Bootstrap local IndexedDB data into syncOutbox ONCE when user first signs in with local data
export async function bootstrapLocalDataToOutbox(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const bootstrapKey = `tsugi_bootstrapped_${userId}`;
  if (localStorage.getItem(bootstrapKey) === 'true') {
    return;
  }

  const outboxCount = await db.syncOutbox.count();
  if (outboxCount > 0) {
    localStorage.setItem(bootstrapKey, 'true');
    return;
  }

  const now = new Date().toISOString();
  const [habits, entries, tasks] = await Promise.all([
    db.habits.toArray(),
    db.habitEntries.toArray(),
    db.tasks.toArray(),
  ]);

  const items: SyncOutboxItem[] = [];

  for (const h of habits) {
    items.push({
      id: uuidv4(),
      entityType: 'habit',
      entityId: h.id,
      operation: 'upsert',
      payload: h as unknown as Record<string, unknown>,
      clientUpdatedAt: h.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    });
  }

  for (const e of entries) {
    items.push({
      id: uuidv4(),
      entityType: 'habitEntry',
      entityId: e.id,
      operation: 'upsert',
      payload: e as unknown as Record<string, unknown>,
      clientUpdatedAt: e.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    });
  }

  for (const t of tasks) {
    items.push({
      id: uuidv4(),
      entityType: 'task',
      entityId: t.id,
      operation: 'upsert',
      payload: t as unknown as Record<string, unknown>,
      clientUpdatedAt: t.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    });
  }

  if (items.length > 0) {
    await db.syncOutbox.bulkAdd(items);
  }

  localStorage.setItem(bootstrapKey, 'true');
}

// Flush pending mutations from IndexedDB outbox to Firestore
export async function flushOutbox(userId: string): Promise<void> {
  const pendingItems = await db.syncOutbox.orderBy('createdAt').toArray();
  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    try {
      if (item.operation === 'upsert' && item.payload) {
        if (item.entityType === 'habit') {
          const ref = doc(firestore, 'users', userId, 'habits', item.entityId);
          await setDoc(ref, removeUndefinedFields({ ...item.payload, userId, deletedAt: null }), { merge: true });
        } else if (item.entityType === 'habitEntry') {
          const ref = doc(firestore, 'users', userId, 'habitEntries', item.entityId);
          await setDoc(ref, removeUndefinedFields({ ...item.payload, userId, deletedAt: null }), { merge: true });
        } else if (item.entityType === 'task') {
          const ref = doc(firestore, 'users', userId, 'tasks', item.entityId);
          await setDoc(ref, removeUndefinedFields({ ...item.payload, userId, deletedAt: null }), { merge: true });
        }
      } else if (item.operation === 'delete') {
        if (item.entityType === 'habit') {
          // Soft-delete habit in Firestore with deletedAt timestamp
          const habitRef = doc(firestore, 'users', userId, 'habits', item.entityId);
          await setDoc(habitRef, {
            deletedAt: item.clientUpdatedAt,
            updatedAt: item.clientUpdatedAt,
            userId,
          }, { merge: true });

          // Also mark associated entries in Firestore as deleted
          const entriesSnap = await getDocs(
            query(collection(firestore, 'users', userId, 'habitEntries'), where('habitId', '==', item.entityId))
          );
          if (!entriesSnap.empty) {
            const batch = writeBatch(firestore);
            entriesSnap.forEach((entryDoc) => {
              batch.set(entryDoc.ref, {
                deletedAt: item.clientUpdatedAt,
                updatedAt: item.clientUpdatedAt,
                userId,
              }, { merge: true });
            });
            await batch.commit();
          }
        } else if (item.entityType === 'habitEntry') {
          const entryRef = doc(firestore, 'users', userId, 'habitEntries', item.entityId);
          await setDoc(entryRef, {
            deletedAt: item.clientUpdatedAt,
            updatedAt: item.clientUpdatedAt,
            userId,
          }, { merge: true });
        } else if (item.entityType === 'task') {
          const taskRef = doc(firestore, 'users', userId, 'tasks', item.entityId);
          await setDoc(taskRef, {
            deletedAt: item.clientUpdatedAt,
            updatedAt: item.clientUpdatedAt,
            userId,
          }, { merge: true });
        }
      }

      // Successfully processed — remove from outbox
      await db.syncOutbox.delete(item.id);
    } catch (err) {
      console.error(`Outbox sync failed for ${item.entityType} ${item.entityId}:`, err);
      await db.syncOutbox.update(item.id, {
        attemptCount: item.attemptCount + 1,
        lastError: err instanceof Error ? err.message : String(err),
      });
      // Stop sequential batch processing on error to maintain order
      throw err;
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tsugi:outbox-changed'));
  }
}

// Pull cloud data into local DB with tombstone and conflict protection
export async function pullCloudToLocal(userId: string): Promise<void> {
  let hasLocalChanges = false;

  // 1. Pull Habits
  const habitsSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'habits'))
  );
  for (const docSnap of habitsSnap.docs) {
    const remoteHabit = { ...docSnap.data() } as Habit & { userId?: string };
    delete remoteHabit.userId;
    const habitId = docSnap.id;

    // A. If marked as deleted in Firestore
    if (remoteHabit.deletedAt) {
      const local = await db.habits.get(habitId);
      if (local) {
        await db.habits.delete(habitId);
        await db.habitEntries.where('habitId').equals(habitId).delete();
        hasLocalChanges = true;
      }
      await db.deletedEntities.put({
        id: habitId,
        entityType: 'habit',
        deletedAt: remoteHabit.deletedAt,
      });
      continue;
    }

    // B. Check if deleted locally with a newer or equal timestamp
    const tombstone = await db.deletedEntities.get(habitId);
    if (tombstone && tombstone.deletedAt >= (remoteHabit.updatedAt || '')) {
      // Local delete takes precedence — do not resurrect
      continue;
    }

    // C. Check if local outbox has pending unsynced changes for this habit
    const pendingOutbox = await db.syncOutbox.where('entityId').equals(habitId).first();
    if (pendingOutbox) {
      // Local in-flight mutation takes precedence
      continue;
    }

    // D. Merge active habit
    const local = await db.habits.get(habitId);
    if (!local) {
      await db.habits.put({ ...remoteHabit, id: habitId });
      hasLocalChanges = true;
    } else if ((remoteHabit.updatedAt || '') > (local.updatedAt || '')) {
      await db.habits.put({ ...remoteHabit, id: habitId });
      hasLocalChanges = true;
    }
  }

  // 2. Pull Habit Entries
  const entriesSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'habitEntries'))
  );
  for (const docSnap of entriesSnap.docs) {
    const remoteEntry = { ...docSnap.data() } as HabitEntry & { userId?: string };
    delete remoteEntry.userId;
    const entryId = docSnap.id;

    if (remoteEntry.deletedAt) {
      const local = await db.habitEntries.get(entryId);
      if (local) {
        await db.habitEntries.delete(entryId);
        hasLocalChanges = true;
      }
      await db.deletedEntities.put({
        id: entryId,
        entityType: 'habitEntry',
        deletedAt: remoteEntry.deletedAt,
      });
      continue;
    }

    const tombstone = await db.deletedEntities.get(entryId);
    if (tombstone && tombstone.deletedAt >= (remoteEntry.updatedAt || '')) {
      continue;
    }

    const pendingOutbox = await db.syncOutbox.where('entityId').equals(entryId).first();
    if (pendingOutbox) {
      continue;
    }

    const local = await db.habitEntries.get(entryId);
    if (!local) {
      await db.habitEntries.put({ ...remoteEntry, id: entryId });
      hasLocalChanges = true;
    } else if ((remoteEntry.updatedAt || '') > (local.updatedAt || '')) {
      await db.habitEntries.put({ ...remoteEntry, id: entryId });
      hasLocalChanges = true;
    }
  }

  // 3. Pull Tasks
  const tasksSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'tasks'))
  );
  for (const docSnap of tasksSnap.docs) {
    const remoteTask = { ...docSnap.data() } as Task & { userId?: string };
    delete remoteTask.userId;
    const taskId = docSnap.id;

    if (remoteTask.deletedAt) {
      const local = await db.tasks.get(taskId);
      if (local) {
        await db.tasks.delete(taskId);
        hasLocalChanges = true;
      }
      await db.deletedEntities.put({
        id: taskId,
        entityType: 'task',
        deletedAt: remoteTask.deletedAt,
      });
      continue;
    }

    const tombstone = await db.deletedEntities.get(taskId);
    if (tombstone && tombstone.deletedAt >= (remoteTask.updatedAt || '')) {
      continue;
    }

    const pendingOutbox = await db.syncOutbox.where('entityId').equals(taskId).first();
    if (pendingOutbox) {
      continue;
    }

    const local = await db.tasks.get(taskId);
    if (!local) {
      await db.tasks.put({ ...remoteTask, id: taskId });
      hasLocalChanges = true;
    } else if ((remoteTask.updatedAt || '') > (local.updatedAt || '')) {
      await db.tasks.put({ ...remoteTask, id: taskId });
      hasLocalChanges = true;
    }
  }

  // Clean up tombstones older than 30 days to keep DB lean
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.deletedEntities.where('deletedAt').below(thirtyDaysAgo).delete();

  if (hasLocalChanges && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tsugi:data-synced'));
  }
}

// Full sync: flush local outbox first, then pull remote updates
export async function syncData(userId: string): Promise<void> {
  // Ensure existing local data is enqueued once on initial login
  await bootstrapLocalDataToOutbox(userId);

  // 1. Flush local outbox mutations to Firestore
  await flushOutbox(userId);

  // 2. Pull remote changes to local IndexedDB (dispatches tsugi:data-synced if local DB changed)
  await pullCloudToLocal(userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tsugi:outbox-changed'));
  }
}
