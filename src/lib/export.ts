'use client';

import { db } from './db';

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV<T extends Record<string, unknown>>(items: T[]): string {
  if (items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map(item =>
    headers.map(h => {
      const val = item[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function exportAsJSON(): Promise<void> {
  const [habits, habitEntries, tasks] = await Promise.all([
    db.habits.toArray(),
    db.habitEntries.toArray(),
    db.tasks.toArray(),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    habits,
    habitEntries,
    tasks,
  };

  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(JSON.stringify(data, null, 2), `trackme-backup-${timestamp}.json`, 'application/json');
}

export async function exportAsCSV(): Promise<void> {
  const [habits, habitEntries, tasks] = await Promise.all([
    db.habits.toArray(),
    db.habitEntries.toArray(),
    db.tasks.toArray(),
  ]);

  const timestamp = new Date().toISOString().split('T')[0];
  const sections = [
    `# TrackMe Export — ${timestamp}`,
    '',
    '## Habits',
    toCSV(habits as unknown as Record<string, unknown>[]),
    '',
    '## Habit Entries',
    toCSV(habitEntries as unknown as Record<string, unknown>[]),
    '',
    '## Tasks',
    toCSV(tasks as unknown as Record<string, unknown>[]),
  ].join('\n');

  downloadFile(sections, `trackme-export-${timestamp}.csv`, 'text/csv');
}
