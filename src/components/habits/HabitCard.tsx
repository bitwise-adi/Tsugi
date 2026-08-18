'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { calculateStreak } from '@/hooks/useHabits';
import { getFrequencyLabel, isHabitScheduledOnDate } from '@/lib/schedule';
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
      setStats(calculateStreak(allEntries, habit));
    };
    load();

    const handleSynced = () => {
      load();
    };
    window.addEventListener('tsugi:data-synced', handleSynced);
    return () => window.removeEventListener('tsugi:data-synced', handleSynced);
  }, [habit]);

  // Get last 7 days status for mini preview
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const entry = entries.find(e => e.date === dateStr);
    const isScheduled = isHabitScheduledOnDate(habit, d);
    return { date: dateStr, status: entry?.status, isScheduled };
  });

  const frequencyLabel = getFrequencyLabel(habit);
  const streakUnit = habit.frequency === 'weekly' ? 'wk' : habit.frequency === 'monthly' ? 'mo' : 'day';

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
          {last7Days.map((day) => {
            let dotCls = styles.dot_empty;
            if (day.status) {
              dotCls = styles[`dot_${day.status}`];
            } else if (!day.isScheduled) {
              dotCls = styles.dot_off;
            }

            return (
              <div
                key={day.date}
                className={`${styles.dayDot} ${dotCls}`}
                title={`${day.date}: ${day.status || (day.isScheduled ? 'scheduled' : 'off-day')}`}
              />
            );
          })}
        </div>

        <div className={styles.statsRow}>
          {stats.current > 0 && (
            <div className={styles.stat}>
              <Flame size={14} className={styles.streakIcon} />
              <span>{stats.current} {streakUnit} streak</span>
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
