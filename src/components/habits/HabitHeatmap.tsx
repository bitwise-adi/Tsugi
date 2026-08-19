'use client';

import { useMemo, useRef, useEffect } from 'react';
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isAfter,
  isSameMonth,
} from 'date-fns';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import type { Habit, HabitEntry } from '@/types';
import styles from './HabitHeatmap.module.css';

interface HabitHeatmapProps {
  entries: HabitEntry[];
  color?: string;
  habit?: Habit;
  selectedMonth?: Date;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitHeatmap({ entries, habit, selectedMonth }: HabitHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { monthBlocks, anchorDate } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const anchor = selectedMonth || today;

    const entryMap = new Map<string, HabitEntry['status']>();
    entries.forEach(e => entryMap.set(e.date, e.status));

    // Generate 12 months ending at anchor month
    const months: {
      monthKey: string;
      label: string;
      year: string;
      isCurrentMonth: boolean;
      weekCols: {
        cells: {
          dateStr?: string;
          dayIdx: number;
          status?: HabitEntry['status'];
          isScheduled?: boolean;
          isFuture?: boolean;
        }[];
      }[];
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const mDate = subMonths(anchor, i);
      const mStart = startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);
      const days = eachDayOfInterval({ start: mStart, end: mEnd });

      // Group days of this month into week columns
      const weekCols: {
        cells: {
          dateStr?: string;
          dayIdx: number;
          status?: HabitEntry['status'];
          isScheduled?: boolean;
          isFuture?: boolean;
        }[];
      }[] = [];

      let currentWeekCells: {
        dateStr?: string;
        dayIdx: number;
        status?: HabitEntry['status'];
        isScheduled?: boolean;
        isFuture?: boolean;
      }[] = [];

      days.forEach(d => {
        const dayOfWeek = getDay(d); // 0=Sun..6=Sat
        // If we reach Sunday and already have cells, push the completed week column
        if (dayOfWeek === 0 && currentWeekCells.length > 0) {
          weekCols.push({ cells: currentWeekCells });
          currentWeekCells = [];
        }

        const dateStr = format(d, 'yyyy-MM-dd');
        const isFuture = isAfter(d, today);
        const isScheduled = habit ? isHabitScheduledOnDate(habit, d) : true;
        const status = isFuture ? undefined : entryMap.get(dateStr);

        currentWeekCells.push({
          dateStr,
          dayIdx: dayOfWeek,
          status,
          isScheduled,
          isFuture,
        });
      });

      if (currentWeekCells.length > 0) {
        weekCols.push({ cells: currentWeekCells });
      }

      months.push({
        monthKey: format(mDate, 'yyyy-MM'),
        label: format(mDate, 'MMM'),
        year: format(mDate, 'yyyy'),
        isCurrentMonth: isSameMonth(mDate, anchor),
        weekCols,
      });
    }

    return { monthBlocks: months, anchorDate: anchor };
  }, [entries, habit, selectedMonth]);

  // Auto-scroll to the end (most recent month/weeks) on mount and on month change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [selectedMonth, monthBlocks]);

  const isScheduleSpecific = habit && habit.frequency !== 'daily';
  const headingText = `1-Year Activity Timeline`;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.label}>{headingText}</div>
        <span className={styles.scrollHint}>← Scroll back 1 year (through {format(anchorDate, 'MMM yyyy')})</span>
      </div>

      <div className={styles.heatmapScrollWrapper} ref={scrollRef}>
        <div className={styles.heatmapGrid}>
          {/* Pinned Sticky Day Labels Column */}
          <div className={styles.dayLabelsCol}>
            <div className={styles.dayLabelsHeaderSpacer} />
            <div className={styles.dayLabelList}>
              {DAY_LABELS.map((dayName, idx) => (
                <div key={idx} className={styles.dayLabel} title={dayName}>
                  {dayName}
                </div>
              ))}
            </div>
          </div>

          {/* Month Blocks Container */}
          <div className={styles.monthsContainer}>
            {monthBlocks.map((month) => (
              <div
                key={month.monthKey}
                className={`${styles.monthBlock} ${month.isCurrentMonth ? styles.currentMonthBlock : ''}`}
              >
                {/* Month Label Header directly above its own weeks */}
                <div className={styles.monthHeader}>
                  <span className={styles.monthLabelText}>{month.label}</span>
                </div>

                {/* Week Columns for this month */}
                <div className={styles.monthWeeksRow}>
                  {month.weekCols.map((week, wi) => (
                    <div key={wi} className={styles.weekCol}>
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const cell = week.cells.find(c => c.dayIdx === dayIdx);
                        if (!cell || !cell.dateStr || cell.isFuture) {
                          return <div key={dayIdx} className={styles.cellBlank} />;
                        }

                        let cls = styles.cellEmpty;
                        let statusDesc = 'scheduled (pending)';

                        if (cell.status === 'done') {
                          cls = styles.cellDone;
                          statusDesc = 'Done';
                        } else if (cell.status === 'missed') {
                          cls = styles.cellMissed;
                          statusDesc = 'Missed';
                        } else if (cell.status === 'excused') {
                          cls = styles.cellExcused;
                          statusDesc = 'Valid Reason (Excused)';
                        } else if (!cell.isScheduled) {
                          cls = styles.cellOffDay;
                          statusDesc = 'Off-day (Not scheduled)';
                        }

                        const dateLabel = format(new Date(cell.dateStr + 'T12:00:00'), 'EEEE, MMMM d, yyyy');

                        return (
                          <div
                            key={dayIdx}
                            className={`${styles.cell} ${cls}`}
                            title={`${dateLabel} • ${statusDesc}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.cell} ${styles.cellDone}`} />
          <span className={styles.legendLabel}>Done</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.cell} ${styles.cellExcused}`} />
          <span className={styles.legendLabel}>Excused</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.cell} ${styles.cellMissed}`} />
          <span className={styles.legendLabel}>Missed</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.cell} ${styles.cellEmpty}`} />
          <span className={styles.legendLabel}>Scheduled</span>
        </div>
        {isScheduleSpecific && (
          <div className={styles.legendItem}>
            <div className={`${styles.cell} ${styles.cellOffDay}`} />
            <span className={styles.legendLabel}>Off-day</span>
          </div>
        )}
      </div>
    </div>
  );
}
