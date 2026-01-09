export interface Habit {
  id: string;
  name: string;
  description?: string;
  type: 'positive' | 'negative';
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays?: number[]; // 0-6 for weekly (Sunday = 0)
  color: string;
  createdAt: string;
  archived: boolean;
}

export interface HabitEntry {
  habitId: string;
  date: string; // YYYY-MM-DD format
  occurred: boolean;
  note?: string;
}

export interface HabitData {
  habits: Habit[];
  entries: HabitEntry[];
  lastSyncedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}
