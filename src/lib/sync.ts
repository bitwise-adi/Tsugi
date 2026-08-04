'use client';

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { db } from './db';
import type { Habit, HabitEntry, Task } from '@/types';

// Firestore does not accept 'undefined' for any field value.
// Strip undefined fields before writing to Firestore.
function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// Upload all local data to Firestore for a user
export async function pushLocalToCloud(userId: string): Promise<void> {
  const batch = writeBatch(firestore);

  // Push habits
  const habits = await db.habits.toArray();
  for (const habit of habits) {
    const ref = doc(firestore, 'users', userId, 'habits', habit.id);
    batch.set(ref, removeUndefinedFields({ ...habit, userId }));
  }

  // Push habit entries
  const entries = await db.habitEntries.toArray();
  for (const entry of entries) {
    const ref = doc(firestore, 'users', userId, 'habitEntries', entry.id);
    batch.set(ref, removeUndefinedFields({ ...entry, userId }));
  }

  // Push tasks
  const tasks = await db.tasks.toArray();
  for (const task of tasks) {
    const ref = doc(firestore, 'users', userId, 'tasks', task.id);
    batch.set(ref, removeUndefinedFields({ ...task, userId }));
  }

  await batch.commit();
}

// Pull cloud data into local DB (merge — cloud wins on conflicts)
export async function pullCloudToLocal(userId: string): Promise<void> {
  // Pull habits
  const habitsSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'habits'))
  );
  for (const docSnap of habitsSnap.docs) {
    const data = docSnap.data() as Habit & { userId: string };
    const { userId: _uid, ...habit } = data;
    const local = await db.habits.get(habit.id);
    if (!local || habit.updatedAt > local.updatedAt) {
      await db.habits.put(habit);
    }
  }

  // Pull habit entries
  const entriesSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'habitEntries'))
  );
  for (const docSnap of entriesSnap.docs) {
    const data = docSnap.data() as HabitEntry & { userId: string };
    const { userId: _uid, ...entry } = data;
    const local = await db.habitEntries.get(entry.id);
    if (!local || entry.updatedAt > local.updatedAt) {
      await db.habitEntries.put(entry);
    }
  }

  // Pull tasks
  const tasksSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'tasks'))
  );
  for (const docSnap of tasksSnap.docs) {
    const data = docSnap.data() as Task & { userId: string };
    const { userId: _uid, ...task } = data;
    const local = await db.tasks.get(task.id);
    if (!local || task.updatedAt > local.updatedAt) {
      await db.tasks.put(task);
    }
  }
}

// Full sync: push local then pull cloud (last-write-wins)
export async function syncData(userId: string): Promise<void> {
  await pushLocalToCloud(userId);
  await pullCloudToLocal(userId);
}

// Save a single item to Firestore
export async function syncHabit(userId: string, habit: Habit): Promise<void> {
  const ref = doc(firestore, 'users', userId, 'habits', habit.id);
  await setDoc(ref, removeUndefinedFields({ ...habit, userId }));
}

export async function syncHabitEntry(userId: string, entry: HabitEntry): Promise<void> {
  const ref = doc(firestore, 'users', userId, 'habitEntries', entry.id);
  await setDoc(ref, removeUndefinedFields({ ...entry, userId }));
}

export async function syncTask(userId: string, task: Task): Promise<void> {
  const ref = doc(firestore, 'users', userId, 'tasks', task.id);
  await setDoc(ref, removeUndefinedFields({ ...task, userId }));
}

export async function deleteSyncedHabit(userId: string, habitId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'users', userId, 'habits', habitId));
  // Also delete associated entries
  const entriesSnap = await getDocs(
    query(collection(firestore, 'users', userId, 'habitEntries'), where('habitId', '==', habitId))
  );
  const batch = writeBatch(firestore);
  entriesSnap.forEach(d => batch.delete(d.ref));
  if (!entriesSnap.empty) await batch.commit();
}

export async function deleteSyncedTask(userId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'users', userId, 'tasks', taskId));
}
