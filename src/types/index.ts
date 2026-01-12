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
  unit?: string; // Optional unit name (e.g., "doses", "glasses", "minutes")
}

export interface HabitEntry {
  habitId: string;
  date: string; // YYYY-MM-DD format
  occurred: boolean;
  note?: string;
  amount?: number; // Optional amount when habit has a unit
}

export type GoalTargetType = 'occurrences' | 'units';
export type GoalPeriod = 'day' | 'week' | 'month'; // day=1, week=7, month=30 days
export type GoalTargetScope = 'per_period' | 'absolute';

export interface Goal {
  id: string;
  habitId: string;
  startDate: string; // YYYY-MM-DD format, must be today or future when created
  period: GoalPeriod; // Period length: day=1, week=7, month=30 days
  periodCount: number;
  targetType: GoalTargetType; // 'occurrences' or 'units' (units only if habit has unit)
  targetScope: GoalTargetScope; // 'per_period' = target per each period, 'absolute' = target for entire range
  targetValue: number;
  createdAt: string;
}

export interface HabitData {
  habits: Habit[];
  entries: HabitEntry[];
  goals: Goal[];
  lastSyncedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}
