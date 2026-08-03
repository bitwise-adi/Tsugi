// LocoMe — Type Definitions

export type AccentColor = 'purple' | 'blue' | 'teal' | 'rose' | 'amber' | 'emerald';
export type ThemeMode = 'light' | 'dark' | 'system';
export type HabitFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type HabitStatus = 'done' | 'missed' | 'excused';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[];        // 0=Sun, 1=Mon, ..., 6=Sat
  specificDates?: string[];     // ISO date strings
  color: string;                // Hex color for the habit card
  icon?: string;                // Lucide icon name
  createdAt: string;
  updatedAt: string;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;                 // 'YYYY-MM-DD'
  status: HabitStatus;
  note?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;                 // 'YYYY-MM-DD'
  time?: string;                // 'HH:mm' for reminder
  completed: boolean;
  priority: TaskPriority;
  note?: string;
  photoUrl?: string;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  theme: ThemeMode;
  accentColor: AccentColor;
  updatedAt: string;
}
