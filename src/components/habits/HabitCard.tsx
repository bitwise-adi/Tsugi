'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { calculateStreak } from '@/hooks/useHabits';
import { ChevronRight, Flame, TrendingUp } from 'lucide-react';
import type { Habit, HabitEntry } from '@/types';
import styles from './HabitCard.module.css';

interface HabitCardProps {
  habit: Habit;
  onClick: () => void;
}

export default function HabitCard({ habit, onClick }: HabitCardProps) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [stats, setStats] = useState({ current: 0, longest: 0, total: 0, rate: 0 });

  useEffect(() => {
    const load = async () => {
      const allEntries = await db.habitEntries
        .where('habitId')
        .equals(habit.id)
        .toArray();
      setEntries(allEntries);
      setStats(calculateStreak(allEntries));
    };
    load();
  }, [habit.id]);

  // Get last 7 days status for mini preview
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === dateStr);
    return { date: dateStr, status: entry?.status };
  });

  const frequencyLabel = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    custom: 'Custom',
  }[habit.frequency];

  return (
    <button
      className={styles.card}
      onClick={onClick}
      id={`habit-card-${habit.id}`}
    >
      <div className={styles.colorBar} style={{ background: habit.color }} />
      <div className={styles.cardBody}>
        <div className={styles.topRow}>
          <div className={styles.info}>
            <h3 className={styles.title}>{habit.title}</h3>
            <span className={styles.frequency}>{frequencyLabel}</span>
          </div>
          <ChevronRight size={20} className={styles.chevron} />
        </div>

        <div className={styles.weekPreview}>
          {last7Days.map((day) => (
            <div
              key={day.date}
              className={`${styles.dayDot} ${day.status ? styles[`dot_${day.status}`] : styles.dot_empty}`}
              title={day.date}
            />
          ))}
        </div>

        <div className={styles.statsRow}>
          {stats.current > 0 && (
            <div className={styles.stat}>
              <Flame size={14} className={styles.streakIcon} />
              <span>{stats.current} day streak</span>
            </div>
          )}
          {stats.rate > 0 && (
            <div className={styles.stat}>
              <TrendingUp size={14} />
              <span>{stats.rate}%</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
