'use client';

import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isAfter } from 'date-fns';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import type { Habit, HabitEntry } from '@/types';
import styles from './HabitChart.module.css';

interface HabitChartProps {
  entries: HabitEntry[];
  color: string;
  habit?: Habit;
}

const NUM_WEEKS = 8;

export default function HabitChart({ entries, color, habit }: HabitChartProps) {
  const weeklyData = useMemo(() => {
    const entryMap = new Map<string, HabitEntry['status']>();
    entries.forEach(e => entryMap.set(e.date, e.status));

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weeks: { label: string; pct: number; done: number; total: number; isOffWeek: boolean }[] = [];

    for (let i = NUM_WEEKS - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i));
      const weekEnd = endOfWeek(subWeeks(today, i));
      // Clamp to today — don't count future days
      const effectiveEnd = isAfter(weekEnd, today) ? today : weekEnd;
      const days = eachDayOfInterval({ start: weekStart, end: effectiveEnd });

      let scheduledDaysCount = 0;
      let done = 0;

      days.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const isScheduled = habit ? isHabitScheduledOnDate(habit, d) : true;
        if (isScheduled) {
          scheduledDaysCount++;
        }
        if (entryMap.get(dateStr) === 'done') {
          done++;
        }
      });

      // If habit is schedule-specific, denominator is scheduled days in that week
      const total = habit && habit.frequency !== 'daily' ? scheduledDaysCount : days.length;
      const isOffWeek = total === 0 && done === 0;

      let pct = 0;
      if (total > 0) {
        pct = Math.min(100, Math.round((done / total) * 100));
      } else if (done > 0) {
        pct = 100;
      }

      weeks.push({
        label: format(weekStart, 'MMM d'),
        pct,
        done,
        total,
        isOffWeek,
      });
    }

    return weeks;
  }, [entries, habit]);

  return (
    <div className={styles.container}>
      <div className={styles.label}>Weekly Completion</div>
      <div className={styles.chart}>
        {weeklyData.map((week, i) => (
          <div key={i} className={styles.barGroup} style={{ animationDelay: `${i * 50}ms` }}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  height: `${week.pct}%`,
                  background: color,
                  opacity: week.pct > 0 ? 0.5 + (week.pct / 100) * 0.5 : 0,
                }}
              />
            </div>
            <span className={styles.barPct}>{week.isOffWeek ? '—' : `${week.pct}%`}</span>
            <span className={styles.barFraction}>
              {week.isOffWeek ? 'Off' : `${week.done}/${week.total}`}
            </span>
            <span className={styles.barLabel}>{week.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
