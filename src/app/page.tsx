'use client';

import { useState, useMemo } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useTasks, getTodayString } from '@/hooks/useTasks';
import { db } from '@/lib/db';
import { useEffect } from 'react';
import HabitCard from '@/components/habits/HabitCard';
import AddHabitModal from '@/components/habits/AddHabitModal';
import HabitDetail from '@/components/habits/HabitDetail';
import { Plus, Sparkles, Sun, Moon, Sunset, CheckCircle2, Target } from 'lucide-react';
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
        onBack={() => setSelectedHabit(null)}
        onDelete={async () => {
          await deleteHabit(selectedHabit.id);
          setSelectedHabit(null);
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Sparkles size={28} className={styles.titleIcon} />
            My Habits
          </h1>
          <p className={styles.subtitle}>
            {habits.length === 0
              ? 'Start building better habits today'
              : `Tracking ${habits.length} habit${habits.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* Today's Summary */}
      {habits.length > 0 && (
        <div className={styles.todaySummary}>
          <div className={styles.greetingRow}>
            <GreetingIcon size={18} className={styles.greetingIcon} />
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
          </div>
        </div>
      )}

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
                  onClick={() => setSelectedHabit(habit)}
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
