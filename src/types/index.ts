// Tsugi(t) — Type Definitions

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
  customDays?: number[];        // 0=Sun, 1=Mon, ..., 6=Sat (or dayOfMonth if monthly)
  intervalWeeks?: number;       // e.g. 1 = every week, 2 = every 2 weeks, 3 = every 3 weeks
  startDate?: string;           // 'YYYY-MM-DD' anchor date for interval calculation
  specificDates?: string[];     // ISO date strings
  color: string;                // Hex color for the habit card
  icon?: string;                // Lucide icon name
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
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
  deletedAt?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;                 // 'YYYY-MM-DD' — date the task belongs to
  dueDate?: string;             // 'YYYY-MM-DD' — optional target / due date
  time?: string;                // 'HH:mm' for reminder
  completed: boolean;
  priority: TaskPriority;
  note?: string;
  photoUrl?: string;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UserPreferences {
  id: string;
  theme: ThemeMode;
  accentColor: AccentColor;
  updatedAt: string;
}

// --- Sync & Outbox ---

export type SyncEntityType = 'habit' | 'habitEntry' | 'task';
export type SyncOperation = 'upsert' | 'delete';
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';

export interface SyncOutboxItem {
  id: string;                      // UUID
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload?: Record<string, unknown> | null; // Record snapshot for upsert
  clientUpdatedAt: string;         // ISO timestamp
  attemptCount: number;
  lastError?: string;
  createdAt: string;
}

export interface DeletedEntity {
  id: string;                      // entityId
  entityType: SyncEntityType;
  deletedAt: string;               // ISO timestamp
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
