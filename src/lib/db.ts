import Dexie, { type EntityTable } from 'dexie';
import type { Habit, HabitEntry, Task, UserPreferences } from '@/types';

const db = new Dexie('LocoMeDB') as Dexie & {
  habits: EntityTable<Habit, 'id'>;
  habitEntries: EntityTable<HabitEntry, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  preferences: EntityTable<UserPreferences, 'id'>;
};

db.version(1).stores({
  habits: 'id, title, frequency, createdAt',
  habitEntries: 'id, habitId, date, status, [habitId+date]',
  tasks: 'id, date, completed, priority, [date+completed]',
  preferences: 'id',
});

export { db };
