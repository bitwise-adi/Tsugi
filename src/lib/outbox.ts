'use client';

import { db } from './db';
import type { Habit, HabitEntry, Task, SyncOutboxItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Trigger debounced background sync notification
export function requestBackgroundSync(delayMs = 2000): void {
  if (typeof window === 'undefined') return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    window.dispatchEvent(new CustomEvent('tsugi:sync-requested'));
  }, delayMs);
}

// Immediately notify that pending items are in outbox (e.g. for status indicator)
export function notifyOutboxChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tsugi:outbox-changed'));
}

// --- Habit Mutations ---

export async function saveHabitWithOutbox(habit: Habit): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.habits, db.syncOutbox, db.deletedEntities], async () => {
    // 1. Write to local habits table
    await db.habits.put(habit);

    // 2. Remove from deleted tombstones if previously deleted
    await db.deletedEntities.delete(habit.id);

    // 3. Remove existing pending outbox items for this habit
    const existingOutbox = await db.syncOutbox.where('entityId').equals(habit.id).toArray();
    for (const item of existingOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    // 4. Enqueue upsert in outbox
    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'habit',
      entityId: habit.id,
      operation: 'upsert',
      payload: habit as unknown as Record<string, unknown>,
      clientUpdatedAt: habit.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}

export async function deleteHabitWithOutbox(habitId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.habits, db.habitEntries, db.syncOutbox, db.deletedEntities], async () => {
    // 1. Delete habit from local table
    await db.habits.delete(habitId);

    // 2. Delete and collect associated entries
    const entries = await db.habitEntries.where('habitId').equals(habitId).toArray();
    await db.habitEntries.where('habitId').equals(habitId).delete();

    // 3. Mark habit in local deletedEntities tombstone
    await db.deletedEntities.put({
      id: habitId,
      entityType: 'habit',
      deletedAt: now,
    });

    // 4. Mark associated entries in deletedEntities
    for (const entry of entries) {
      await db.deletedEntities.put({
        id: entry.id,
        entityType: 'habitEntry',
        deletedAt: now,
      });
    }

    // 5. Remove any pending outbox items for this habit or its entries
    const habitOutbox = await db.syncOutbox.where('entityId').equals(habitId).toArray();
    for (const item of habitOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    for (const entry of entries) {
      const entryOutbox = await db.syncOutbox.where('entityId').equals(entry.id).toArray();
      for (const item of entryOutbox) {
        await db.syncOutbox.delete(item.id);
      }
    }

    // 6. Enqueue delete operation in outbox
    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'habit',
      entityId: habitId,
      operation: 'delete',
      payload: null,
      clientUpdatedAt: now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}

// --- Habit Entry Mutations ---

export async function saveHabitEntryWithOutbox(entry: HabitEntry): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.habitEntries, db.syncOutbox, db.deletedEntities], async () => {
    // 1. Write to local habitEntries table
    await db.habitEntries.put(entry);

    // 2. Remove from deleted tombstones
    await db.deletedEntities.delete(entry.id);

    // 3. Remove existing pending outbox items for this entry
    const existingOutbox = await db.syncOutbox.where('entityId').equals(entry.id).toArray();
    for (const item of existingOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    // 4. Enqueue upsert in outbox
    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'habitEntry',
      entityId: entry.id,
      operation: 'upsert',
      payload: entry as unknown as Record<string, unknown>,
      clientUpdatedAt: entry.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}

export async function deleteHabitEntryWithOutbox(entryId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.habitEntries, db.syncOutbox, db.deletedEntities], async () => {
    await db.habitEntries.delete(entryId);

    await db.deletedEntities.put({
      id: entryId,
      entityType: 'habitEntry',
      deletedAt: now,
    });

    const existingOutbox = await db.syncOutbox.where('entityId').equals(entryId).toArray();
    for (const item of existingOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'habitEntry',
      entityId: entryId,
      operation: 'delete',
      payload: null,
      clientUpdatedAt: now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}

// --- Task Mutations ---

export async function saveTaskWithOutbox(task: Task): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.tasks, db.syncOutbox, db.deletedEntities], async () => {
    // 1. Write to local tasks table
    await db.tasks.put(task);

    // 2. Remove from deleted tombstones
    await db.deletedEntities.delete(task.id);

    // 3. Remove existing pending outbox items for this task
    const existingOutbox = await db.syncOutbox.where('entityId').equals(task.id).toArray();
    for (const item of existingOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    // 4. Enqueue upsert in outbox
    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'task',
      entityId: task.id,
      operation: 'upsert',
      payload: task as unknown as Record<string, unknown>,
      clientUpdatedAt: task.updatedAt || now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}

export async function deleteTaskWithOutbox(taskId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.tasks, db.syncOutbox, db.deletedEntities], async () => {
    // 1. Delete from local table
    await db.tasks.delete(taskId);

    // 2. Mark in deletedEntities tombstone
    await db.deletedEntities.put({
      id: taskId,
      entityType: 'task',
      deletedAt: now,
    });

    // 3. Remove pending outbox items for this task
    const existingOutbox = await db.syncOutbox.where('entityId').equals(taskId).toArray();
    for (const item of existingOutbox) {
      await db.syncOutbox.delete(item.id);
    }

    // 4. Enqueue delete operation in outbox
    const outboxItem: SyncOutboxItem = {
      id: uuidv4(),
      entityType: 'task',
      entityId: taskId,
      operation: 'delete',
      payload: null,
      clientUpdatedAt: now,
      attemptCount: 0,
      createdAt: now,
    };
    await db.syncOutbox.add(outboxItem);
  });

  notifyOutboxChanged();
  requestBackgroundSync();
}
