'use client';

import { useState, useMemo } from 'react';
import HabitHeatmap from './HabitHeatmap';
import HabitChart from './HabitChart';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isFuture,
  isSameMonth,
} from 'date-fns';
import { calculateStreak } from '@/hooks/useHabits';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Flame,
  TrendingUp,
  Trophy,
  Hash,
  Eye,
  User,
} from 'lucide-react';
import type { Habit, HabitEntry } from '@/types';
import styles from './SharedHabitView.module.css';

interface SharedHabitViewProps {
  habit: Habit;
  entries: HabitEntry[];
  ownerName: string;
  onBack: () => void;
}

export default function SharedHabitView({ habit, entries, ownerName, onBack }: SharedHabitViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const stats = useMemo(() => calculateStreak(entries, habit), [entries, habit]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getEntryForDate = (date: string) => entries.find(e => e.date === date);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} id="shared-habit-back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <div className={styles.colorDot} style={{ background: habit.color }} />
            <h1 className={styles.title}>{habit.title}</h1>
          </div>
          <div className={styles.ownerRow}>
            <User size={12} />
            <span className={styles.ownerName}>{ownerName}</span>
          </div>
        </div>
        <div className={styles.readOnlyBadge}>
          <Eye size={14} />
          <span>View Only</span>
        </div>
      </header>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Flame size={18} className={styles.statIconFire} />
          <div className={styles.statValue}>{stats.current}</div>
          <div className={styles.statLabel}>Current</div>
        </div>
        <div className={styles.statCard}>
          <Trophy size={18} className={styles.statIconTrophy} />
          <div className={styles.statValue}>{stats.longest}</div>
          <div className={styles.statLabel}>Best</div>
        </div>
        <div className={styles.statCard}>
          <Hash size={18} className={styles.statIconTotal} />
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total</div>
        </div>
        <div className={styles.statCard}>
          <TrendingUp size={18} className={styles.statIconRate} />
          <div className={styles.statValue}>{stats.rate}%</div>
          <div className={styles.statLabel}>Rate</div>
        </div>
      </div>

      {/* Analytics */}
      <div className={styles.analyticsSection}>
        <HabitHeatmap entries={entries} color={habit.color} habit={habit} />
        <HabitChart entries={entries} color={habit.color} habit={habit} />
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button
          className={styles.monthBtn}
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className={styles.monthLabel}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          className={styles.monthBtn}
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid (read-only — no click handlers) */}
      <div className={styles.calendar}>
        <div className={styles.dayLabels}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className={styles.dayLabel}>{d}</div>
          ))}
        </div>

        <div className={styles.dateGrid}>
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.dateCell} />
          ))}

          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const entry = getEntryForDate(dateStr);
            const isScheduled = isHabitScheduledOnDate(habit, day);
            const today = isToday(day);
            const future = isFuture(day) && !today;
            const inMonth = isSameMonth(day, currentMonth);

            let statusClass = '';
            if (entry?.status === 'done') {
              statusClass = isScheduled ? styles.cellDone : styles.cellBonusDone;
            } else if (entry?.status === 'missed') {
              statusClass = styles.cellMissed;
            } else if (entry?.status === 'excused') {
              statusClass = styles.cellExcused;
            } else if (!isScheduled) {
              statusClass = styles.cellOffDay;
            }

            return (
              <div
                key={dateStr}
                className={`
                  ${styles.dateCell}
                  ${statusClass}
                  ${today ? styles.cellToday : ''}
                  ${future ? styles.cellFuture : ''}
                  ${!inMonth ? styles.cellOutside : ''}
                `}
              >
                <span className={styles.dateNumber}>{format(day, 'd')}</span>
                {entry && (
                  <span className={styles.statusIcon}>
                    {entry.status === 'done' && <Check size={12} />}
                    {entry.status === 'missed' && <X size={12} />}
                    {entry.status === 'excused' && <AlertTriangle size={10} />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
