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

// --- Sharing ---

export interface HabitShare {
  id: string;
  shareCode: string;              // Unique short code (e.g., 'a3k9x2')
  ownerUserId: string;            // Who created the share
  ownerDisplayName: string;       // Display name of the owner
  habitId: string;                // Which habit is shared
  habitTitle: string;             // Title of the habit (denormalized for listing)
  habitColor: string;             // Color of the habit (denormalized)
  sharedWithUserId?: string;      // Populated when someone claims the code
  sharedWithDisplayName?: string; // Display name of the recipient
  createdAt: string;
  status: 'active' | 'revoked';
}
