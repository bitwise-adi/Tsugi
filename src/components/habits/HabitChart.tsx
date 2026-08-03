'use client';

import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isAfter } from 'date-fns';
import type { HabitEntry } from '@/types';
import styles from './HabitChart.module.css';

interface HabitChartProps {
  entries: HabitEntry[];
  color: string;
}

const NUM_WEEKS = 8;

export default function HabitChart({ entries, color }: HabitChartProps) {
  const weeklyData = useMemo(() => {
    const entryMap = new Map<string, HabitEntry['status']>();
    entries.forEach(e => entryMap.set(e.date, e.status));

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weeks: { label: string; pct: number; done: number; total: number }[] = [];

    for (let i = NUM_WEEKS - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i));
      const weekEnd = endOfWeek(subWeeks(today, i));
      // Clamp to today — don't count future days
      const effectiveEnd = isAfter(weekEnd, today) ? today : weekEnd;
      const days = eachDayOfInterval({ start: weekStart, end: effectiveEnd });

      // Denominator = actual days in the week (up to today), NOT entries logged
      const total = days.length;
      let done = 0;
      days.forEach(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (entryMap.get(dateStr) === 'done') done++;
      });

      weeks.push({
        label: format(weekStart, 'MMM d'),
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        done,
        total,
      });
    }

    return weeks;
  }, [entries]);

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
            <span className={styles.barPct}>{week.pct}%</span>
            <span className={styles.barFraction}>{week.done}/{week.total}</span>
            <span className={styles.barLabel}>{week.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
