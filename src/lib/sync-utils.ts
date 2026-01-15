import type { HabitData, Habit, HabitEntry, Goal } from '../types';

function compareHabits(a: Habit, b: Habit): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.description === b.description &&
    a.type === b.type &&
    a.frequency === b.frequency &&
    a.color === b.color &&
    a.createdAt === b.createdAt &&
    a.archived === b.archived &&
    a.unit === b.unit &&
    JSON.stringify(a.targetDays) === JSON.stringify(b.targetDays)
  );
}

function compareEntries(a: HabitEntry, b: HabitEntry): boolean {
  return (
    a.habitId === b.habitId &&
    a.date === b.date &&
    a.occurred === b.occurred &&
    a.note === b.note &&
    a.amount === b.amount
  );
}

function compareGoals(a: Goal, b: Goal): boolean {
  return (
    a.id === b.id &&
    a.habitId === b.habitId &&
    a.startDate === b.startDate &&
    a.period === b.period &&
    a.periodCount === b.periodCount &&
    a.targetType === b.targetType &&
    a.targetScope === b.targetScope &&
    a.targetValue === b.targetValue &&
    a.createdAt === b.createdAt
  );
}

export function deepCompare(a: HabitData, b: HabitData): boolean {
  // Compare habits
  if (a.habits.length !== b.habits.length) {
    return false;
  }
  for (const habitA of a.habits) {
    const habitB = b.habits.find((h) => h.id === habitA.id);
    if (!habitB || !compareHabits(habitA, habitB)) {
      return false;
    }
  }

  // Compare entries
  if (a.entries.length !== b.entries.length) {
    return false;
  }
  for (const entryA of a.entries) {
    const entryB = b.entries.find(
      (e) => e.habitId === entryA.habitId && e.date === entryA.date
    );
    if (!entryB || !compareEntries(entryA, entryB)) {
      return false;
    }
  }

  // Compare goals
  if (a.goals.length !== b.goals.length) {
    return false;
  }
  for (const goalA of a.goals) {
    const goalB = b.goals.find((g) => g.id === goalA.id);
    if (!goalB || !compareGoals(goalA, goalB)) {
      return false;
    }
  }

  return true;
}
