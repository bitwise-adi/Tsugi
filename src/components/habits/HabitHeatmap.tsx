'use client';

import { useMemo, useRef, useEffect } from 'react';
import { format, subDays, isAfter, endOfMonth, isSameMonth } from 'date-fns';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import type { Habit, HabitEntry } from '@/types';
import styles from './HabitHeatmap.module.css';

interface HabitHeatmapProps {
  entries: HabitEntry[];
  color?: string;
  habit?: Habit;
  selectedMonth?: Date;
}

// 52 weeks = 364 days (~1 full year)
const FULL_YEAR_DAYS = 364;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitHeatmap({ entries, habit, selectedMonth }: HabitHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, monthGroups, anchorDate } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let anchor: Date;
    if (selectedMonth) {
      if (isSameMonth(selectedMonth, today)) {
        anchor = today;
      } else {
        anchor = endOfMonth(selectedMonth);
        anchor.setHours(23, 59, 59, 999);
      }
    } else {
      anchor = today;
    }

    const entryMap = new Map<string, HabitEntry['status']>();
    entries.forEach(e => entryMap.set(e.date, e.status));

    // Start from 52 weeks (364 days) ago, aligned to Sunday
    const rawStart = subDays(anchor, FULL_YEAR_DAYS);
    const startOffset = rawStart.getDay(); // 0=Sun
    const startDate = subDays(rawStart, startOffset); // align to Sunday

    // Build week columns
    const weekCols: {
      isFirstInMonth: boolean;
      cells: {
        date: string;
        day: number;
        status?: HabitEntry['status'];
        isScheduled: boolean;
        isFuture: boolean;
      }[];
    }[] = [];

    let d = new Date(startDate);
    let colIndex = 0;
    let currentMonthKey = '';

    while (!isAfter(d, anchor) || d.getDay() !== 0) {
      // Start a new week column on Sunday
      if (d.getDay() === 0) {
        // Use Wednesday (d + 3 days) as representative day for the week
        const midWeekDate = new Date(d);
        midWeekDate.setDate(midWeekDate.getDate() + 3);
        const weekMonthKey = format(midWeekDate, 'yyyy-MM');
        const isFirst = weekMonthKey !== currentMonthKey && colIndex > 0;
        if (weekMonthKey !== currentMonthKey) {
          currentMonthKey = weekMonthKey;
        }

        weekCols.push({ isFirstInMonth: isFirst, cells: [] });
        colIndex++;
      }

      const dateStr = format(d, 'yyyy-MM-dd');
      const isFuture = isAfter(d, today);
      const isScheduled = habit ? isHabitScheduledOnDate(habit, d) : true;
      const currentWeek = weekCols[weekCols.length - 1];
      if (currentWeek) {
        currentWeek.cells.push({
          date: dateStr,
          day: d.getDay(),
          status: isFuture ? undefined : entryMap.get(dateStr),
          isScheduled,
          isFuture,
        });
      }

      d = new Date(d);
      d.setDate(d.getDate() + 1);

      // Safety limit: max 55 columns
      if (colIndex > 55) break;
    }

    // Compute month headers with exact column widths
    const groups: { monthKey: string; label: string; year: string; colCount: number }[] = [];
    weekCols.forEach((col) => {
      const repDay = col.cells[3] || col.cells[0];
      const repDate = repDay ? new Date(repDay.date + 'T12:00:00') : new Date();
      const monthKey = format(repDate, 'yyyy-MM');
      const label = format(repDate, 'MMM');
      const year = format(repDate, 'yyyy');

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthKey === monthKey) {
        lastGroup.colCount += 1;
      } else {
        groups.push({ monthKey, label, year, colCount: 1 });
      }
    });

    return { weeks: weekCols, monthGroups: groups, anchorDate: anchor };
  }, [entries, habit, selectedMonth]);

  // Auto-scroll to the end (most recent month/weeks) on mount and on month change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [selectedMonth, weeks]);

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

          {/* Scrollable Month Headers & Week Columns */}
          <div className={styles.columnsContainer}>
            {/* Month headers row aligned with column spans */}
            <div className={styles.monthHeadersRow}>
              {monthGroups.map((group) => {
                // Width = (colCount * 14px cell) + ((colCount - 1) * 3px gap) + (new month border offset)
                const groupWidth = group.colCount * 17 - 3;
                return (
                  <div
                    key={group.monthKey}
                    className={styles.monthHeaderGroup}
                    style={{ width: `${groupWidth}px`, minWidth: `${groupWidth}px` }}
                  >
                    <span className={styles.monthHeaderText}>{group.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Week columns grid */}
            <div className={styles.weeksRow}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className={`${styles.weekCol} ${week.isFirstInMonth ? styles.newMonthCol : ''}`}
                >
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const cell = week.cells.find(c => c.day === dayIdx);
                    if (!cell || cell.isFuture) {
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

                    const dateLabel = format(new Date(cell.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy');

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
