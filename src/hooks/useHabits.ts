'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import {
  saveHabitWithOutbox,
  deleteHabitWithOutbox,
  saveHabitEntryWithOutbox,
  deleteHabitEntryWithOutbox,
} from '@/lib/outbox';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import type { Habit, HabitEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, format } from 'date-fns';

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
    let cancelled = false;
    db.habits
      .orderBy('createdAt')
      .reverse()
      .toArray()
      .then((allHabits) => {
        if (!cancelled) {
          setHabits(allHabits);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load habits:', err);
        if (!cancelled) setLoading(false);
      });

    const handleSynced = () => {
      db.habits
        .orderBy('createdAt')
        .reverse()
        .toArray()
        .then((allHabits) => {
          if (!cancelled) {
            setHabits(prev => {
              if (
                prev.length === allHabits.length &&
                prev.every((h, i) => h.id === allHabits[i].id && h.updatedAt === allHabits[i].updatedAt)
              ) {
                return prev;
              }
              return allHabits;
            });
          }
        });
    };

    window.addEventListener('tsugi:data-synced', handleSynced);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleSynced);
    };
  }, []);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newHabit: Habit = {
      ...habit,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await saveHabitWithOutbox(newHabit);
    setHabits(prev => [newHabit, ...prev]);
    return newHabit;
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    const current = await db.habits.get(id);
    if (!current) return;
    const updatedHabit: Habit = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveHabitWithOutbox(updatedHabit);
    setHabits(prev => prev.map(h => h.id === id ? updatedHabit : h));
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    await deleteHabitWithOutbox(id);
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
    let cancelled = false;
    db.habitEntries
      .where('habitId')
      .equals(habitId)
      .toArray()
      .then((allEntries) => {
        if (!cancelled) {
          setEntries(allEntries);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load entries:', err);
        if (!cancelled) setLoading(false);
      });

    const handleSynced = () => {
      db.habitEntries
        .where('habitId')
        .equals(habitId)
        .toArray()
        .then((allEntries) => {
          if (!cancelled) {
            setEntries(prev => {
              if (
                prev.length === allEntries.length &&
                prev.every((e, i) => e.id === allEntries[i].id && e.status === allEntries[i].status && e.updatedAt === allEntries[i].updatedAt)
              ) {
                return prev;
              }
              return allEntries;
            });
          }
        });
    };

    window.addEventListener('tsugi:data-synced', handleSynced);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleSynced);
    };
  }, [habitId]);

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
      const updated: HabitEntry = {
        ...existing,
        status,
        note: note !== undefined ? note : existing.note,
        updatedAt: now,
      };
      await saveHabitEntryWithOutbox(updated);
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
      await saveHabitEntryWithOutbox(newEntry);
      setEntries(prev => [...prev, newEntry]);
    }
  }, [habitId]);

  const updateNote = useCallback(async (date: string, note: string) => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();

    if (existing) {
      const updated: HabitEntry = {
        ...existing,
        note,
        updatedAt: new Date().toISOString(),
      };
      await saveHabitEntryWithOutbox(updated);
      setEntries(prev => prev.map(e => e.id === existing.id ? updated : e));
    }
  }, [habitId]);

  const deleteEntry = useCallback(async (date: string) => {
    const existing = await db.habitEntries
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();

    if (existing) {
      await deleteHabitEntryWithOutbox(existing.id);
      setEntries(prev => prev.filter(e => e.id !== existing.id));
    }
  }, [habitId]);

  const getEntryForDate = useCallback((date: string) => {
    return entries.find(e => e.date === date);
  }, [entries]);

  return { entries, loading, setEntry, deleteEntry, updateNote, getEntryForDate, refreshEntries: loadEntries };
}

// --- Streak Calculation ---

export function calculateStreak(
  entries: HabitEntry[],
  habit?: Habit
): { current: number; longest: number; total: number; rate: number } {
  const doneEntries = entries.filter(e => e.status === 'done');
  const totalDone = doneEntries.length;

  if (entries.length === 0 && totalDone === 0) {
    return { current: 0, longest: 0, total: 0, rate: 0 };
  }

  const doneDateSet = new Set(doneEntries.map(e => e.date));

  // If no habit is provided or habit is daily, use standard consecutive daily streak
  if (!habit || habit.frequency === 'daily') {
    const sortedDoneDates = Array.from(doneDateSet).sort().reverse();
    if (sortedDoneDates.length === 0) return { current: 0, longest: 0, total: 0, rate: 0 };

    const totalEntries = Math.max(entries.length, 1);
    const rate = Math.round((totalDone / totalEntries) * 100);

    let current = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (doneDateSet.has(dateStr)) {
        current++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let longest = 0;
    let tempStreak = 1;
    const allSorted = Array.from(doneDateSet).sort();

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

  // --- Schedule-Aware Streak & Rate Calculation ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute start date from habit creation or earliest entry (up to 90 days ago)
  const createdDate = new Date(habit.createdAt || Date.now());
  createdDate.setHours(0, 0, 0, 0);
  const earliestDate = entries.length > 0
    ? new Date(entries.map(e => e.date).sort()[0] + 'T00:00:00')
    : createdDate;
  const startDate = new Date(Math.min(createdDate.getTime(), earliestDate.getTime()));

  // Collect all scheduled dates from startDate to today
  const scheduledDates: string[] = [];
  const iterDate = new Date(startDate);
  while (iterDate <= today) {
    if (isHabitScheduledOnDate(habit, iterDate)) {
      scheduledDates.push(iterDate.toISOString().split('T')[0]);
    }
    iterDate.setDate(iterDate.getDate() + 1);
  }

  // Rate: completed scheduled occurrences / total scheduled occurrences
  const totalScheduled = scheduledDates.length;
  const scheduledDoneCount = scheduledDates.filter(d => doneDateSet.has(d)).length;
  const rate = totalScheduled > 0
    ? Math.min(100, Math.round((Math.max(scheduledDoneCount, totalDone) / totalScheduled) * 100))
    : (totalDone > 0 ? 100 : 0);

  // Current streak on scheduled days
  let current = 0;
  const reversedScheduled = [...scheduledDates].reverse();
  const todayStr = today.toISOString().split('T')[0];

  for (let i = 0; i < reversedScheduled.length; i++) {
    const dStr = reversedScheduled[i];
    if (doneDateSet.has(dStr)) {
      current++;
    } else {
      // If today is scheduled and not yet marked done, don't break streak yet
      if (i === 0 && dStr === todayStr) {
        continue;
      }
      break;
    }
  }

  // Longest streak on scheduled days
  let longest = 0;
  let runningStreak = 0;
  for (const dStr of scheduledDates) {
    if (doneDateSet.has(dStr)) {
      runningStreak++;
      longest = Math.max(longest, runningStreak);
    } else {
      runningStreak = 0;
    }
  }
  longest = Math.max(longest, current);

  return { current, longest, total: totalDone, rate };
}

/**
 * Calculates the completion rate (%) for a specific month.
 * If the month is the current month, only days up to today are evaluated
 * so that future days do not artificially lower the completion percentage.
 */
export function calculateMonthRate(
  entries: HabitEntry[],
  habit: Habit,
  monthDate: Date
): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const mStart = startOfMonth(monthDate);
  const mEnd = endOfMonth(monthDate);
  const effectiveEnd = isSameMonth(monthDate, today) ? today : mEnd;

  if (mStart > today) {
    return 0; // Future month
  }

  const days = eachDayOfInterval({ start: mStart, end: effectiveEnd });
  const doneDates = new Set(entries.filter(e => e.status === 'done').map(e => e.date));

  let scheduledCount = 0;
  let doneCount = 0;

  days.forEach(d => {
    const isScheduled = isHabitScheduledOnDate(habit, d);
    if (isScheduled) {
      scheduledCount++;
      const dateStr = format(d, 'yyyy-MM-dd');
      if (doneDates.has(dateStr)) {
        doneCount++;
      }
    }
  });

  if (scheduledCount === 0) return doneCount > 0 ? 100 : 0;
  return Math.min(100, Math.round((doneCount / scheduledCount) * 100));
}
