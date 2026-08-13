import Dexie, { type EntityTable } from 'dexie';
import type { Habit, HabitEntry, Task, UserPreferences } from '@/types';

const db = new Dexie('TsugiDB') as Dexie & {
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

// Automatic one-time migration from legacy LocoMeDB if present
if (typeof window !== 'undefined') {
  Dexie.exists('LocoMeDB').then(async (exists) => {
    if (exists) {
      try {
        const oldDb = new Dexie('LocoMeDB');
        await oldDb.open();
        const habits = await oldDb.table('habits').toArray();
        const habitEntries = await oldDb.table('habitEntries').toArray();
        const tasks = await oldDb.table('tasks').toArray();
        const preferences = await oldDb.table('preferences').toArray();

        if (habits.length) await db.habits.bulkPut(habits);
        if (habitEntries.length) await db.habitEntries.bulkPut(habitEntries);
        if (tasks.length) await db.tasks.bulkPut(tasks);
        if (preferences.length) await db.preferences.bulkPut(preferences);

        await oldDb.close();
        await Dexie.delete('LocoMeDB');
      } catch (err) {
        console.warn('LocoMeDB migration notice (ignored):', err);
      }
    }
  });
}

export { db };
