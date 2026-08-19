'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { saveTaskWithOutbox, deleteTaskWithOutbox } from '@/lib/outbox';
import { scheduleTaskReminder, cancelTaskReminder } from '@/lib/notifications';
import type { Task } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export function useTasks(dateFilter?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      let result: Task[];
      if (dateFilter) {
        result = await db.tasks
          .where('date')
          .equals(dateFilter)
          .toArray();
      } else {
        result = await db.tasks.orderBy('date').toArray();
      }
      // Sort: incomplete first, then by priority (high > medium > low), then by time
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        // Completed tasks go last
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // Then by priority
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Then by time (tasks with time first)
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        // Then by creation time
        return a.createdAt.localeCompare(b.createdAt);
      });
      setTasks(result);
      // Schedule reminders for tasks with time + reminderEnabled
      result.forEach(t => {
        if (t.reminderEnabled && t.time && !t.completed) {
          scheduleTaskReminder(t.id, t.title, t.date, t.time);
        }
      });
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    let cancelled = false;

    const fetchTasks = async () => {
      try {
        let result: Task[];
        if (dateFilter) {
          result = await db.tasks
            .where('date')
            .equals(dateFilter)
            .toArray();
        } else {
          result = await db.tasks.orderBy('date').toArray();
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        result.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          if (a.time && !b.time) return -1;
          if (!a.time && b.time) return 1;
          if (a.time && b.time) return a.time.localeCompare(b.time);
          return a.createdAt.localeCompare(b.createdAt);
        });
        if (!cancelled) {
          setTasks(prev => {
            if (
              prev.length === result.length &&
              prev.every((t, i) => t.id === result[i].id && t.updatedAt === result[i].updatedAt && t.completed === result[i].completed)
            ) {
              return prev;
            }
            return result;
          });
          setLoading(false);
        }
        result.forEach(t => {
          if (t.reminderEnabled && t.time && !t.completed) {
            scheduleTaskReminder(t.id, t.title, t.date, t.time);
          }
        });
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (!cancelled) setLoading(false);
      }
    };

    fetchTasks();

    const handleSynced = () => {
      fetchTasks();
    };

    window.addEventListener('tsugi:data-synced', handleSynced);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleSynced);
    };
  }, [dateFilter]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
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
    setTasks(prev => {
      const updated = [...prev, newTask];
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      updated.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.createdAt.localeCompare(b.createdAt);
      });
      return updated;
    });
    return newTask;
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const current = await db.tasks.get(id);
    if (!current) return;
    const updatedTask: Task = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await saveTaskWithOutbox(updatedTask);
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? updatedTask : t);
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      updated.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.createdAt.localeCompare(b.createdAt);
      });
      return updated;
    });
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    const task = await db.tasks.get(id);
    if (!task) return;
    const updatedTask: Task = {
      ...task,
      completed: !task.completed,
      updatedAt: new Date().toISOString(),
    };
    await saveTaskWithOutbox(updatedTask);
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? updatedTask : t);
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      updated.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.createdAt.localeCompare(b.createdAt);
      });
      return updated;
    });
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    cancelTaskReminder(id);
    await deleteTaskWithOutbox(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  return { tasks, loading, addTask, updateTask, toggleComplete, deleteTask, refreshTasks: loadTasks };
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

  const loadSummary = useCallback(async () => {
    try {
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

      setTaskSummaryByDate(byDate);
      setPastPendingCount(pastPendingTotal);

      const sortedPastDates = Object.entries(pastGroups)
        .map(([date, pendingCount]) => ({ date, pendingCount }))
        .sort((a, b) => b.date.localeCompare(a.date)); // Most recent past date first

      setPastPendingDates(sortedPastDates);
    } catch (err) {
      console.error('Failed to load tasks summary:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    db.tasks.toArray().then(allTasks => {
      if (cancelled) return;
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

      setTaskSummaryByDate(byDate);
      setPastPendingCount(pastPendingTotal);

      const sortedPastDates = Object.entries(pastGroups)
        .map(([date, pendingCount]) => ({ date, pendingCount }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setPastPendingDates(sortedPastDates);
    }).catch(err => console.error('Failed to load tasks summary:', err));

    const handleDataChanged = () => {
      loadSummary();
    };

    window.addEventListener('tsugi:data-synced', handleDataChanged);
    window.addEventListener('tsugi:outbox-changed', handleDataChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('tsugi:data-synced', handleDataChanged);
      window.removeEventListener('tsugi:outbox-changed', handleDataChanged);
    };
  }, [loadSummary]);

  return { taskSummaryByDate, pastPendingCount, pastPendingDates, refreshSummary: loadSummary };
}

// Helper to get today's date string
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
