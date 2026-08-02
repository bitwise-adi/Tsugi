'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Habit, HabitEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// --- Habit CRUD ---

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    try {
      const allHabits = await db.habits.orderBy('createdAt').reverse().toArray();
      setHabits(allHabits);
    } catch (err) {
      console.error('Failed to load habits:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newHabit: Habit = {
      ...habit,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.habits.add(newHabit);
    setHabits(prev => [newHabit, ...prev]);
    return newHabit;
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const updatedFields = { ...updates, updatedAt: new Date().toISOString() };
    await db.habits.update(id, updatedFields);
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updatedFields } : h));
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    await db.habits.delete(id);
    await db.habitEntries.where('habitId').equals(id).delete();
    setHabits(prev => prev.filter(h => h.id !== id));
  }, []);

  return { habits, loading, addHabit, updateHabit, deleteHabit, refreshHabits: loadHabits };
}

// --- Habit Entries ---

export function useHabitEntries(habitId: string) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      const allEntries = await db.habitEntries
        .where('habitId')
        .equals(habitId)
        .toArray();
      setEntries(allEntries);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const setEntry = useCallback(async (
    date: string,
    status: HabitEntry['status'],
    note?: string
  ) => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();

    const now = new Date().toISOString();

    if (existing) {
      const updated = { ...existing, status, note: note ?? existing.note, updatedAt: now };
      await db.habitEntries.update(existing.id, updated);
      setEntries(prev => prev.map(e => e.id === existing.id ? updated : e));
    } else {
      const newEntry: HabitEntry = {
        id: uuidv4(),
        habitId,
        date,
        status,
        note,
        createdAt: now,
        updatedAt: now,
      };
      await db.habitEntries.add(newEntry);
      setEntries(prev => [...prev, newEntry]);
    }
  }, [habitId]);

  const updateNote = useCallback(async (date: string, note: string) => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();

    if (existing) {
      await db.habitEntries.update(existing.id, { note, updatedAt: new Date().toISOString() });
      setEntries(prev => prev.map(e => e.id === existing.id ? { ...e, note } : e));
    }
  }, [habitId]);

  const getEntryForDate = useCallback((date: string) => {
    return entries.find(e => e.date === date);
  }, [entries]);

  return { entries, loading, setEntry, updateNote, getEntryForDate, refreshEntries: loadEntries };
}

// --- Streak Calculation ---

export function calculateStreak(entries: HabitEntry[]): { current: number; longest: number; total: number; rate: number } {
  if (entries.length === 0) return { current: 0, longest: 0, total: 0, rate: 0 };

  const sortedDates = entries
    .filter(e => e.status === 'done')
    .map(e => e.date)
    .sort()
    .reverse();

  const totalDone = sortedDates.length;
  const totalEntries = entries.length;
  const rate = totalEntries > 0 ? Math.round((totalDone / totalEntries) * 100) : 0;

  if (sortedDates.length === 0) return { current: 0, longest: 0, total: 0, rate };

  // Calculate current streak
  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sortedDates.includes(dateStr)) {
      current++;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  let longest = 0;
  let tempStreak = 1;
  const allSorted = [...sortedDates].sort();

  for (let i = 1; i < allSorted.length; i++) {
    const prev = new Date(allSorted[i - 1]);
    const curr = new Date(allSorted[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longest = Math.max(longest, tempStreak);
      tempStreak = 1;
    }
  }
  longest = Math.max(longest, tempStreak);

  return { current, longest, total: totalDone, rate };
}
