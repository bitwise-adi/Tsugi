'use client';

import { useState, useMemo } from 'react';
import HabitHeatmap from './HabitHeatmap';
import HabitChart from './HabitChart';
import MonthPickerModal from './MonthPickerModal';
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
import { calculateStreak, calculateMonthRate } from '@/hooks/useHabits';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
  Flame,
  TrendingUp,
  Trophy,
  Hash,
  Eye,
  User,
  FileText,
} from 'lucide-react';
import type { Habit, HabitEntry } from '@/types';
import styles from './SharedHabitView.module.css';

interface SharedHabitViewProps {
  habit: Habit;
  entries: HabitEntry[];
  ownerName?: string;
  sharedByName?: string;
  onBack?: () => void;
}

export default function SharedHabitView({
  habit,
  entries,
  ownerName,
  sharedByName,
  onBack,
}: SharedHabitViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const displayName = ownerName || sharedByName;

  const stats = useMemo(() => calculateStreak(entries, habit), [entries, habit]);
  const monthRate = useMemo(() => calculateMonthRate(entries, habit, currentMonth), [entries, habit, currentMonth]);

  const entriesCountByMonth = useMemo(() => {
    const counts: { [yearMonth: string]: number } = {};
    for (const e of entries) {
      if (e.status) {
        const ym = e.date.substring(0, 7);
        counts[ym] = (counts[ym] || 0) + 1;
      }
    }
    return counts;
  }, [entries]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getEntryForDate = (date: string) => entries.find(e => e.date === date);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        {onBack && (
          <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <div className={styles.colorDot} style={{ background: habit.color }} />
            <h1 className={styles.title}>{habit.title}</h1>
          </div>
          {habit.description && (
            <p className={styles.description}>{habit.description}</p>
          )}
          {displayName && (
            <div className={styles.sharedByBadge}>
              <User size={12} />
              <span>Shared by {displayName}</span>
            </div>
          )}
        </div>
        <div className={styles.readOnlyBadge}>
          <Eye size={14} />
          <span>Read-only</span>
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
          <div className={styles.statValue}>{monthRate}%</div>
          <div className={styles.statLabel}>{format(currentMonth, 'MMM')} Rate</div>
        </div>
      </div>

      {/* Analytics: Heatmap + Weekly Chart */}
      <div className={styles.analyticsSection}>
        <HabitHeatmap entries={entries} color={habit.color} habit={habit} selectedMonth={currentMonth} />
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
        <button
          className={styles.monthSelectTrigger}
          onClick={() => setShowMonthPicker(true)}
          aria-label="Select month"
          title="Click to jump to any month"
        >
          <h2 className={styles.monthLabel}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <ChevronDown size={16} className={styles.monthSelectChevron} />
        </button>
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
                {entry?.note && (
                  <span className={styles.noteIndicator} title={`Note: ${entry.note}`}>
                    <FileText size={9} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exploded Month Picker Modal */}
      {showMonthPicker && (
        <MonthPickerModal
          currentMonth={currentMonth}
          onSelectMonth={setCurrentMonth}
          onClose={() => setShowMonthPicker(false)}
          entriesCountByMonth={entriesCountByMonth}
        />
      )}
    </div>
  );
}
