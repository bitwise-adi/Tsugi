import { format, eachDayOfInterval, differenceInCalendarWeeks } from 'date-fns';
import type { Habit } from '@/types';

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Determines whether a habit is scheduled to occur on a given date.
 */
export function isHabitScheduledOnDate(habit: Habit, targetDate: Date | string): boolean {
  const date = typeof targetDate === 'string' ? new Date(targetDate + 'T00:00:00') : targetDate;
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfMonth = date.getDate(); // 1..31
  const dateStr = format(date, 'yyyy-MM-dd');

  switch (habit.frequency) {
    case 'daily':
      return true;

    case 'weekly':
    case 'biweekly': {
      // Determine target days of week
      let targetDays: number[];
      if (habit.customDays && habit.customDays.length > 0) {
        targetDays = habit.customDays;
      } else if (habit.frequency === 'biweekly') {
        targetDays = [1, 4]; // Default Mon & Thu
      } else {
        const createdDate = new Date(habit.createdAt || Date.now());
        targetDays = [createdDate.getDay()];
      }

      if (!targetDays.includes(dayOfWeek)) {
        return false;
      }

      // Interval weeks: e.g. 1 = every week, 2 = every 2 weeks, 3 = every 3 weeks
      const interval = habit.intervalWeeks || (habit.frequency === 'biweekly' ? 2 : 1);
      if (interval <= 1) {
        return true;
      }

      // Anchor week for the interval calculation
      const anchorDate = habit.startDate
        ? new Date(habit.startDate + 'T00:00:00')
        : new Date(habit.createdAt || Date.now());

      const weekDiff = differenceInCalendarWeeks(date, anchorDate, { weekStartsOn: 0 });
      return ((weekDiff % interval) + interval) % interval === 0;
    }

    case 'monthly': {
      if (habit.customDays && habit.customDays.length > 0) {
        return dayOfMonth === habit.customDays[0];
      }
      const createdDate = new Date(habit.createdAt || Date.now());
      return dayOfMonth === createdDate.getDate();
    }

    case 'custom': {
      if (habit.specificDates && habit.specificDates.length > 0) {
        return habit.specificDates.includes(dateStr);
      }
      if (habit.customDays && habit.customDays.length > 0) {
        if (!habit.customDays.includes(dayOfWeek)) return false;

        const interval = habit.intervalWeeks || 1;
        if (interval > 1) {
          const anchorDate = habit.startDate
            ? new Date(habit.startDate + 'T00:00:00')
            : new Date(habit.createdAt || Date.now());
          const weekDiff = differenceInCalendarWeeks(date, anchorDate, { weekStartsOn: 0 });
          return ((weekDiff % interval) + interval) % interval === 0;
        }
        return true;
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Returns the number of scheduled occurrences for a habit within a date range (inclusive).
 */
export function getScheduledCountInInterval(habit: Habit, start: Date, end: Date): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const day of days) {
    if (isHabitScheduledOnDate(habit, day)) {
      count++;
    }
  }
  return count;
}

/**
 * Gets a human-friendly string describing the habit frequency and schedule.
 */
export function getFrequencyLabel(habit: Habit): string {
  const interval = habit.intervalWeeks || (habit.frequency === 'biweekly' ? 2 : 1);

  switch (habit.frequency) {
    case 'daily':
      return 'Daily';

    case 'weekly':
    case 'biweekly': {
      const days = habit.customDays && habit.customDays.length > 0
        ? habit.customDays.map(d => DAY_NAMES_SHORT[d]).join(', ')
        : 'Weekly';

      if (interval === 1) {
        return habit.customDays && habit.customDays.length === 1
          ? `Weekly (${DAY_NAMES_SHORT[habit.customDays[0]]})`
          : `Weekly (${days})`;
      }
      if (interval === 2) {
        return `Every 2 weeks (${days})`;
      }
      if (interval === 3) {
        return `Every 3 weeks (${days})`;
      }
      return `Every ${interval} weeks (${days})`;
    }

    case 'monthly': {
      if (habit.customDays && habit.customDays.length > 0) {
        const day = habit.customDays[0];
        const suffix = getOrdinalSuffix(day);
        return `Monthly (${day}${suffix})`;
      }
      return 'Monthly';
    }

    case 'custom': {
      if (habit.customDays && habit.customDays.length > 0) {
        let dayDesc = habit.customDays.map(d => DAY_NAMES_SHORT[d]).join(', ');
        if (habit.customDays.length === 7) dayDesc = 'Every day';
        else if (habit.customDays.length === 5 && !habit.customDays.includes(0) && !habit.customDays.includes(6)) {
          dayDesc = 'Weekdays';
        } else if (habit.customDays.length === 2 && habit.customDays.includes(0) && habit.customDays.includes(6)) {
          dayDesc = 'Weekends';
        }

        if (interval > 1) {
          return `Every ${interval} weeks (${dayDesc})`;
        }
        return `Custom (${dayDesc})`;
      }
      return 'Custom schedule';
    }

    default:
      return 'Daily';
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
