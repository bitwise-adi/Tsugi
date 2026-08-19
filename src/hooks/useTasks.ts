'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { saveTaskWithOutbox, deleteTaskWithOutbox } from '@/lib/outbox';
import { scheduleTaskReminder, cancelTaskReminder } from '@/lib/notifications';
import type { Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Deterministically sorts tasks:
 * 1. Incomplete before completed
 * 2. High priority > Medium > Low
 * 3. Timed tasks first (chronological)
 * 4. Created timestamp
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pA = PRIORITY_ORDER[a.priority] ?? 1;
    const pB = PRIORITY_ORDER[b.priority] ?? 1;
    if (pA !== pB) return pA - pB;
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function useTasks(dateFilter?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const queryTasks = useCallback(async (): Promise<Task[]> => {
    let raw: Task[];
    if (dateFilter) {
      raw = await db.tasks.where('date').equals(dateFilter).toArray();
    } else {
      raw = await db.tasks.orderBy('date').toArray();
    }
    return sortTasks(raw);
  }, [dateFilter]);

  const loadTasks = useCallback(async () => {
    try {
      const sorted = await queryTasks();
      setTasks(sorted);
      sorted.forEach(t => {
        if (t.reminderEnabled && t.time && !t.completed) {
          scheduleTaskReminder(t.id, t.title, t.date, t.time);
        }
      });
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [queryTasks]);

  useEffect(() => {
    let cancelled = false;

    queryTasks()
      .then(sorted => {
        if (!cancelled) {
          setTasks(prev => {
            if (
              prev.length === sorted.length &&
              prev.every(
                (t, i) =>
                  t.id === sorted[i].id &&
                  t.updatedAt === sorted[i].updatedAt &&
                  t.completed === sorted[i].completed
              )
            ) {
              return prev;
            }
            return sorted;
          });
          setLoading(false);
        }
        sorted.forEach(t => {
          if (t.reminderEnabled && t.time && !t.completed) {
            scheduleTaskReminder(t.id, t.title, t.date, t.time);
          }
        });
      })
      .catch(err => {
        console.error('Failed to load tasks:', err);
        if (!cancelled) setLoading(false);
      });

    const handleSynced = () => {
      queryTasks().then(sorted => {
        if (!cancelled) {
          setTasks(prev => {
            if (
              prev.length === sorted.length &&
              prev.every(
                (t, i) =>
                  t.id === sorted[i].id &&
                  t.updatedAt === sorted[i].updatedAt &&
                  t.completed === sorted[i].completed
              )
            ) {
              return prev;
            }
            return sorted;
          });
        }
      });
    };

    window.addEventListener('tsugi:data-synced', handleSynced);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleSynced);
    };
  }, [queryTasks]);

  const addTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newTask: Task = {
        ...task,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
      await saveTaskWithOutbox(newTask);
      if (newTask.reminderEnabled && newTask.time) {
        scheduleTaskReminder(newTask.id, newTask.title, newTask.date, newTask.time);
      }
      if (!dateFilter || newTask.date === dateFilter) {
        setTasks(prev => sortTasks([...prev, newTask]));
      }
      return newTask;
    },
    [dateFilter]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const current = await db.tasks.get(id);
      if (!current) return;
      const updatedTask: Task = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await saveTaskWithOutbox(updatedTask);
      if (dateFilter && updatedTask.date !== dateFilter) {
        setTasks(prev => prev.filter(t => t.id !== id));
      } else {
        setTasks(prev => {
          const exists = prev.some(t => t.id === id);
          const next = exists ? prev.map(t => (t.id === id ? updatedTask : t)) : [...prev, updatedTask];
          return sortTasks(next);
        });
      }
    },
    [dateFilter]
  );

  const toggleComplete = useCallback(
    async (id: string) => {
      const task = await db.tasks.get(id);
      if (!task) return;
      const updatedTask: Task = {
        ...task,
        completed: !task.completed,
        updatedAt: new Date().toISOString(),
      };
      await saveTaskWithOutbox(updatedTask);
      if (dateFilter && updatedTask.date !== dateFilter) {
        setTasks(prev => prev.filter(t => t.id !== id));
      } else {
        setTasks(prev => {
          const next = prev.map(t => (t.id === id ? updatedTask : t));
          return sortTasks(next);
        });
      }
    },
    [dateFilter]
  );

  const deleteTask = useCallback(async (id: string) => {
    cancelTaskReminder(id);
    await deleteTaskWithOutbox(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleComplete,
    deleteTask,
    refreshTasks: loadTasks,
  };
}

export interface DayTaskSummary {
  total: number;
  completed: number;
  pending: number;
}

export function usePendingTasksSummary() {
  const [taskSummaryByDate, setTaskSummaryByDate] = useState<{ [dateStr: string]: DayTaskSummary }>({});
  const [pastPendingCount, setPastPendingCount] = useState(0);
  const [pastPendingDates, setPastPendingDates] = useState<{ date: string; pendingCount: number }[]>([]);

  const computeSummary = useCallback(async () => {
    const allTasks = await db.tasks.toArray();
    const todayStr = getTodayString();
    const byDate: { [dateStr: string]: DayTaskSummary } = {};
    let pastPendingTotal = 0;
    const pastGroups: { [dateStr: string]: number } = {};

    for (const t of allTasks) {
      if (!byDate[t.date]) {
        byDate[t.date] = { total: 0, completed: 0, pending: 0 };
      }
      byDate[t.date].total += 1;
      if (t.completed) {
        byDate[t.date].completed += 1;
      } else {
        byDate[t.date].pending += 1;
        if (t.date < todayStr) {
          pastPendingTotal += 1;
          pastGroups[t.date] = (pastGroups[t.date] || 0) + 1;
        }
      }
    }

    const sortedPastDates = Object.entries(pastGroups)
      .map(([date, pendingCount]) => ({ date, pendingCount }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return { byDate, pastPendingTotal, sortedPastDates };
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const { byDate, pastPendingTotal, sortedPastDates } = await computeSummary();
      setTaskSummaryByDate(byDate);
      setPastPendingCount(pastPendingTotal);
      setPastPendingDates(sortedPastDates);
    } catch (err) {
      console.error('Failed to load tasks summary:', err);
    }
  }, [computeSummary]);

  useEffect(() => {
    let cancelled = false;

    computeSummary()
      .then(({ byDate, pastPendingTotal, sortedPastDates }) => {
        if (!cancelled) {
          setTaskSummaryByDate(byDate);
          setPastPendingCount(pastPendingTotal);
          setPastPendingDates(sortedPastDates);
        }
      })
      .catch(err => console.error('Failed to load tasks summary:', err));

    const handleDataChanged = () => {
      computeSummary().then(({ byDate, pastPendingTotal, sortedPastDates }) => {
        if (!cancelled) {
          setTaskSummaryByDate(byDate);
          setPastPendingCount(pastPendingTotal);
          setPastPendingDates(sortedPastDates);
        }
      });
    };

    window.addEventListener('tsugi:data-synced', handleDataChanged);
    window.addEventListener('tsugi:outbox-changed', handleDataChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleDataChanged);
      window.removeEventListener('tsugi:outbox-changed', handleDataChanged);
    };
  }, [computeSummary]);

  return {
    taskSummaryByDate,
    pastPendingCount,
    pastPendingDates,
    refreshSummary: loadSummary,
  };
}

// Helper to get today's date string
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
