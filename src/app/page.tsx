'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useTasks, getTodayString } from '@/hooks/useTasks';
import { db } from '@/lib/db';
import HabitCard from '@/components/habits/HabitCard';
import AddHabitModal from '@/components/habits/AddHabitModal';
import HabitDetail from '@/components/habits/HabitDetail';
import { Plus, Sun, Moon, Sunset, CheckCircle2, Target, TrendingUp } from 'lucide-react';
import type { Habit, HabitEntry } from '@/types';
import styles from './page.module.css';

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sun };
  if (hour < 17) return { text: 'Good afternoon', icon: Sunset };
  return { text: 'Good evening', icon: Moon };
}

export default function HabitsPage() {
  const { habits, loading, addHabit, deleteHabit } = useHabits();
  const { tasks } = useTasks(getTodayString());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [todayEntries, setTodayEntries] = useState<HabitEntry[]>([]);

  // Load today's entries for all habits
  const today = getTodayString();
  useEffect(() => {
    db.habitEntries.where('date').equals(today).toArray().then(setTodayEntries);
  }, [habits, today]);

  // --- URL Hash Navigation for HabitDetail ---
  // When we enter a habit detail, push a hash so browser back works
  const selectHabit = useCallback((habit: Habit) => {
    setSelectedHabit(habit);
    window.history.pushState({ habitId: habit.id }, '', `#habit-${habit.id}`);
  }, []);

  const deselectHabit = useCallback(() => {
    setSelectedHabit(null);
    // Only push state if hash is still present (avoid double push)
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (!window.location.hash.startsWith('#habit-')) {
        setSelectedHabit(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Restore from hash on mount (e.g. page reload while viewing a habit)
  useEffect(() => {
    if (!loading && window.location.hash.startsWith('#habit-')) {
      const habitId = window.location.hash.replace('#habit-', '');
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        setSelectedHabit(habit);
      }
    }
  }, [loading, habits]);

  const greeting = useMemo(() => getGreeting(), []);
  const GreetingIcon = greeting.icon;

  const todayStats = useMemo(() => {
    const doneCount = todayEntries.filter(e => e.status === 'done').length;
    const completedTasks = tasks.filter(t => t.completed).length;
    return {
      habitsDone: doneCount,
      habitsTotal: habits.length,
      tasksDone: completedTasks,
      tasksTotal: tasks.length,
    };
  }, [todayEntries, habits, tasks]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingPulse} />
          <p>Loading habits...</p>
        </div>
      </div>
    );
  }

  if (selectedHabit) {
    return (
      <HabitDetail
        habit={selectedHabit}
        onBack={deselectHabit}
        onDelete={async () => {
          await deleteHabit(selectedHabit.id);
          deselectHabit();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Header */}
      <header className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Loco<span className={styles.heroTitleAccent}>Me</span>
          </h1>
          <p className={styles.heroTagline}>
            Build momentum. Track progress. Stay consistent.
          </p>
        </div>

        {/* Today's Summary — integrated into hero */}
        <div className={styles.heroStats}>
          <div className={styles.greetingRow}>
            <GreetingIcon size={16} className={styles.greetingIcon} />
            <span className={styles.greetingText}>{greeting.text}</span>
          </div>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <Target size={16} className={styles.summaryIconHabits} />
              <span className={styles.summaryValue}>
                {todayStats.habitsDone}/{todayStats.habitsTotal}
              </span>
              <span className={styles.summaryLabel}>Habits</span>
            </div>
            <div className={styles.summaryCard}>
              <CheckCircle2 size={16} className={styles.summaryIconTasks} />
              <span className={styles.summaryValue}>
                {todayStats.tasksDone}/{todayStats.tasksTotal}
              </span>
              <span className={styles.summaryLabel}>Tasks</span>
            </div>
            {habits.length > 0 && (
              <div className={styles.summaryCard}>
                <TrendingUp size={16} className={styles.summaryIconStreak} />
                <span className={styles.summaryValue}>
                  {todayStats.habitsTotal > 0
                    ? Math.round((todayStats.habitsDone / todayStats.habitsTotal) * 100)
                    : 0}%
                </span>
                <span className={styles.summaryLabel}>Today</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Habit subtitle */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>My Habits</h2>
        <span className={styles.sectionCount}>
          {habits.length === 0
            ? 'Start building better habits today'
            : `${habits.length} habit${habits.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      <div className={styles.content}>
        {habits.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <h2 className={styles.emptyTitle}>No habits yet</h2>
            <p className={styles.emptyText}>
              Create your first habit and start tracking your progress. Consistency is the key to growth!
            </p>
            <button
              className={styles.emptyButton}
              onClick={() => setShowAddModal(true)}
              id="add-first-habit-btn"
            >
              <Plus size={20} />
              Add Your First Habit
            </button>
          </div>
        ) : (
          <div className={styles.habitList}>
            {habits.map((habit, index) => (
              <div
                key={habit.id}
                className={styles.habitCardWrapper}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <HabitCard
                  habit={habit}
                  onClick={() => selectHabit(habit)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {habits.length > 0 && (
        <button
          className={styles.fab}
          onClick={() => setShowAddModal(true)}
          id="add-habit-fab"
          aria-label="Add new habit"
        >
          <Plus size={24} />
        </button>
      )}

      {showAddModal && (
        <AddHabitModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (habitData) => {
            await addHabit(habitData);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
