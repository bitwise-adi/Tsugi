'use client';

import { useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import HabitCard from '@/components/habits/HabitCard';
import AddHabitModal from '@/components/habits/AddHabitModal';
import HabitDetail from '@/components/habits/HabitDetail';
import { Plus, Sparkles } from 'lucide-react';
import type { Habit } from '@/types';
import styles from './page.module.css';

export default function HabitsPage() {
  const { habits, loading, addHabit, deleteHabit } = useHabits();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

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
