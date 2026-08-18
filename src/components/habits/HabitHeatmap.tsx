'use client';

import { useMemo } from 'react';
import { format, subDays, isAfter } from 'date-fns';
import { isHabitScheduledOnDate } from '@/lib/schedule';
import type { Habit, HabitEntry } from '@/types';
import styles from './HabitHeatmap.module.css';

interface HabitHeatmapProps {
  entries: HabitEntry[];
  color: string;
  habit?: Habit;
}

// Show ~13 weeks (91 days = ~3 months) — fits well on mobile
const TOTAL_DAYS = 91;

export default function HabitHeatmap({ entries, color, habit }: HabitHeatmapProps) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const entryMap = new Map<string, HabitEntry['status']>();
    entries.forEach(e => entryMap.set(e.date, e.status));

    // Start from TOTAL_DAYS ago, aligned to Sunday
    const rawStart = subDays(today, TOTAL_DAYS - 1);
    const startOffset = rawStart.getDay(); // 0=Sun
    const startDate = subDays(rawStart, startOffset); // align to Sunday

    // Build week columns
    const weekCols: {
      cells: {
        date: string;
        day: number;
        status?: HabitEntry['status'];
        isScheduled: boolean;
        isFuture: boolean;
      }[];
    }[] = [];
    const months: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    let d = new Date(startDate);
    let colIndex = 0;
    while (!isAfter(d, today) || d.getDay() !== 0) {
      // Start a new week column on Sunday
      if (d.getDay() === 0) {
        weekCols.push({ cells: [] });

        // Track month transitions
        if (d.getMonth() !== lastMonth) {
          months.push({ label: format(d, 'MMM'), colIndex });
          lastMonth = d.getMonth();
        }
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

      // Safety: don't loop forever
      if (colIndex > 20) break;
    }

    return { weeks: weekCols, monthLabels: months };
  }, [entries, habit]);

  const isScheduleSpecific = habit && habit.frequency !== 'daily';

  return (
    <div className={styles.container}>
      <div className={styles.label}>Activity — Last 3 Months</div>

      <div className={styles.heatmapScroll}>
        {/* Month labels row */}
        <div className={styles.topRow}>
          <div className={styles.dayLabelSpacer} />
          <div className={styles.monthLabels}>
            {weeks.map((_, wi) => {
              const monthEntry = monthLabels.find(m => m.colIndex === wi);
              return (
                <div key={wi} className={styles.monthCell}>
                  {monthEntry ? monthEntry.label : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid body: day labels + cells */}
        <div className={styles.gridBody}>
          {/* Day labels */}
          <div className={styles.dayLabels}>
            {['', 'M', '', 'W', '', 'F', ''].map((lbl, i) => (
              <div key={i} className={styles.dayLabel}>{lbl}</div>
            ))}
          </div>

          {/* Week columns */}
          <div className={styles.weeksRow}>
            {weeks.map((week, wi) => (
              <div key={wi} className={styles.weekCol}>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cell = week.cells.find(c => c.day === dayIdx);
                  if (!cell || cell.isFuture) {
                    return <div key={dayIdx} className={styles.cellBlank} />;
                  }

                  let cls = styles.cellEmpty;
                  if (cell.status === 'done') cls = styles.cellDone;
                  else if (cell.status === 'missed') cls = styles.cellMissed;
                  else if (cell.status === 'excused') cls = styles.cellExcused;
                  else if (!cell.isScheduled) cls = styles.cellOffDay;

                  const dateLabel = format(new Date(cell.date + 'T12:00:00'), 'EEE, MMM d');
                  const statusDesc = cell.status
                    ? cell.status
                    : !cell.isScheduled
                    ? 'off-day'
                    : 'no entry';

                  return (
                    <div
                      key={dayIdx}
                      className={`${styles.cell} ${cls}`}
                      style={cell.status === 'done' ? { backgroundColor: color } as React.CSSProperties : undefined}
                      title={`${dateLabel}: ${statusDesc}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Scheduled</span>
        <div className={`${styles.cell} ${styles.cellEmpty}`} />
        {isScheduleSpecific && (
          <>
            <span className={styles.legendDivider} />
            <span className={styles.legendLabel}>Off-day</span>
            <div className={`${styles.cell} ${styles.cellOffDay}`} />
          </>
        )}
        <span className={styles.legendDivider} />
        <span className={styles.legendLabel}>Done</span>
        <div className={`${styles.cell} ${styles.cellDone}`} style={{ backgroundColor: color }} />
        <span className={styles.legendDivider} />
        <span className={styles.legendLabel}>Missed</span>
        <div className={`${styles.cell} ${styles.cellMissed}`} />
        <span className={styles.legendDivider} />
        <span className={styles.legendLabel}>Excused</span>
        <div className={`${styles.cell} ${styles.cellExcused}`} />
      </div>
    </div>
  );
}
