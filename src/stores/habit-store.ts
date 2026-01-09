import { create } from 'zustand';
import type { Habit, HabitEntry, HabitData } from '../types';

interface HabitState {
  habits: Habit[];
  entries: HabitEntry[];
  lastSyncedAt: string | null;
  isLoading: boolean;
  setHabitData: (data: HabitData) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleEntry: (habitId: string, date: string) => void;
  setLoading: (loading: boolean) => void;
  getHabitData: () => HabitData;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  entries: [],
  lastSyncedAt: null,
  isLoading: false,

  setHabitData: (data) =>
    set({
      habits: data.habits,
      entries: data.entries,
      lastSyncedAt: data.lastSyncedAt,
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

  setLoading: (loading) => set({ isLoading: loading }),

  getHabitData: () => ({
    habits: get().habits,
    entries: get().entries,
    lastSyncedAt: get().lastSyncedAt || new Date().toISOString(),
  }),
}));
