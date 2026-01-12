import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Habit, HabitEntry, HabitData, Goal } from '../types';

interface HabitState {
  habits: Habit[];
  entries: HabitEntry[];
  goals: Goal[];
  lastSyncedAt: string | null;
  isLoading: boolean;
  setHabitData: (data: HabitData) => void;
  clearHabitData: () => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleEntry: (habitId: string, date: string) => void;
  setEntry: (habitId: string, date: string, occurred: boolean, amount?: number) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setLoading: (loading: boolean) => void;
  getHabitData: () => HabitData;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
  habits: [],
  entries: [],
  goals: [],
  lastSyncedAt: null,
  isLoading: false,

  setHabitData: (data) =>
    set({
      habits: data.habits,
      entries: data.entries,
      goals: data.goals || [],
      lastSyncedAt: data.lastSyncedAt,
    }),

  clearHabitData: () =>
    set({
      habits: [],
      entries: [],
      goals: [],
      lastSyncedAt: null,
    }),

  addHabit: (habit) =>
    set((state) => ({
      habits: [...state.habits, habit],
    })),

  updateHabit: (id, updates) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  deleteHabit: (id) =>
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
      entries: state.entries.filter((e) => e.habitId !== id),
      goals: state.goals.filter((g) => g.habitId !== id),
    })),

  toggleEntry: (habitId, date) =>
    set((state) => {
      const existing = state.entries.find(
        (e) => e.habitId === habitId && e.date === date
      );

      if (existing) {
        return {
          entries: state.entries.map((e) =>
            e.habitId === habitId && e.date === date
              ? { ...e, occurred: !e.occurred }
              : e
          ),
        };
      }

      return {
        entries: [
          ...state.entries,
          { habitId, date, occurred: true },
        ],
      };
    }),

  setEntry: (habitId, date, occurred, amount) =>
    set((state) => {
      const existing = state.entries.find(
        (e) => e.habitId === habitId && e.date === date
      );

      if (existing) {
        return {
          entries: state.entries.map((e) =>
            e.habitId === habitId && e.date === date
              ? { ...e, occurred, amount }
              : e
          ),
        };
      }

      return {
        entries: [
          ...state.entries,
          { habitId, date, occurred, amount },
        ],
      };
    }),

  addGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, goal],
    })),

  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  deleteGoal: (id) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  getHabitData: () => ({
    habits: get().habits,
    entries: get().entries,
    goals: get().goals,
    lastSyncedAt: get().lastSyncedAt || new Date().toISOString(),
  }),
    }),
    {
      name: 'habitly-storage',
      partialize: (state) => ({
        habits: state.habits,
        entries: state.entries,
        goals: state.goals,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
