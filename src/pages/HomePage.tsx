import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { useAuthStore } from '../stores/auth-store';
import { loadHabitData, saveHabitData, getDefaultHabitData, migrateHabitData } from '../lib/google-drive';
import { formatDate } from '../lib/calendar';
import type { Habit } from '../types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getDateDisplay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDate(date) === formatDate(today)) {
    return 'Today';
  }
  if (formatDate(date) === formatDate(yesterday)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isToday(date: Date): boolean {
  return formatDate(date) === formatDate(new Date());
}

function parseDate(dateStr: string | null): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr + 'T00:00:00');
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { habits, entries, setHabitData, addHabit, updateHabit, deleteHabit, toggleEntry, getHabitData, isLoading, setLoading } =
    useHabitStore();
  const { accessToken } = useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<'positive' | 'negative'>('positive');
  const [isSaving, setIsSaving] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Read date from URL or default to today
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => parseDate(dateParam));

  const selectedDateStr = formatDate(selectedDate);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;

      setLoading(true);
      try {
        const data = await loadHabitData(accessToken);
        if (data) {
          setHabitData(migrateHabitData(data));
        } else {
          setHabitData(getDefaultHabitData());
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setHabitData(getDefaultHabitData());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, setHabitData, setLoading]);

  const syncToCloud = async () => {
    if (!accessToken) return;

    setIsSaving(true);
    try {
      await saveHabitData(accessToken, getHabitData());
    } catch (error) {
      console.error('Failed to save data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;

    const habit: Habit = {
      id: generateId(),
      name: newHabitName.trim(),
      type: newHabitType,
      frequency: 'daily',
      color: COLORS[habits.length % COLORS.length],
      createdAt: new Date().toISOString(),
      archived: false,
    };

    addHabit(habit);
    setNewHabitName('');
    setNewHabitType('positive');
    setShowAddForm(false);
    await syncToCloud();
  };

  const handleToggle = async (habitId: string) => {
    toggleEntry(habitId, selectedDateStr);
    await syncToCloud();
  };

  const handleDeleteHabit = async (habitId: string) => {
    deleteHabit(habitId);
    setDeleteConfirmId(null);
    await syncToCloud();
  };

  const handleEditHabit = async (habit: Habit, updates: { name: string; type: 'positive' | 'negative'; createdAt: string }) => {
    updateHabit(habit.id, updates);
    setEditingHabit(null);
    await syncToCloud();
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setSearchParams({ date: formatDate(newDate) });
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't allow going to future dates
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      setSearchParams({ date: formatDate(newDate) });
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setSearchParams({});
  };

  // Check if an entry exists for selected date and occurred is true
  const hasOccurred = (habitId: string): boolean => {
    return entries.some(
      (e) => e.habitId === habitId && e.date === selectedDateStr && e.occurred
    );
  };

  // Determine if a habit is "successful" on selected date
  // Positive: occurred = success (green)
  // Negative: NOT occurred = success (green)
  const isSuccess = (habit: Habit): boolean => {
    const occurred = hasOccurred(habit.id);
    return habit.type === 'positive' ? occurred : !occurred;
  };

  const activeHabits = habits.filter((h) => {
    let active = !h.archived
    if (h?.createdAt && selectedDate) {
      const createdDate = new Date(h.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      active = active && (selectedDate >= createdDate);
    }

    return active;
  });
  const successCount = activeHabits.filter((h) => isSuccess(h)).length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Date Navigation */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-[var(--color-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="text-center">
              <div className="font-semibold text-[var(--color-text)]">
                {getDateDisplay(selectedDate)}
              </div>
              {!isToday(selectedDate) && (
                <button
                  onClick={goToToday}
                  className="text-xs text-[var(--color-primary)] hover:underline mt-1"
                >
                  Back to today
                </button>
              )}
            </div>

            <button
              onClick={goToNextDay}
              disabled={isToday(selectedDate)}
              className={`p-2 rounded-lg transition-colors ${
                isToday(selectedDate)
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-[var(--color-background)]'
              }`}
            >
              <svg
                className="w-5 h-5 text-[var(--color-text)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </Card>

        {/* Progress Summary */}
        <Card>
          <div className="text-center">
            <div className="text-4xl font-bold text-[var(--color-text)]">
              {successCount}/{activeHabits.length}
            </div>
            <div className="text-[var(--color-text-muted)] text-sm mt-1">
              habits on track {isToday(selectedDate) ? 'today' : 'this day'}
            </div>
            {activeHabits.length > 0 && (
              <div className="mt-3 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-success)] transition-all duration-300"
                  style={{
                    width: `${(successCount / activeHabits.length) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Habits List */}
        <div className="space-y-3">
          {activeHabits.map((habit) => {
            const occurred = hasOccurred(habit.id);
            const success = isSuccess(habit);

            // Determine checkbox color based on habit type and state
            // Positive + occurred = green (success)
            // Positive + not occurred = empty (needs action)
            // Negative + occurred = red (failed)
            // Negative + not occurred = green (success)
            let checkboxStyle = 'border-[var(--color-border)]';
            if (occurred) {
              checkboxStyle = habit.type === 'positive'
                ? 'bg-green-500 border-green-500'
                : 'bg-red-500 border-red-500';
            }

            return (
              <Card key={habit.id} className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${checkboxStyle}`}
                  onClick={() => handleToggle(habit.id)}
                >
                  {occurred && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {habit.type === 'positive' ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      )}
                    </svg>
                  )}
                </div>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleToggle(habit.id)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        success
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {habit.name}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        habit.type === 'positive'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {habit.type === 'positive' ? '+' : '−'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/calendar/${habit.id}`)}
                  className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                  title="View calendar"
                >
                  <svg
                    className="w-5 h-5 text-[var(--color-text-muted)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingHabit(habit)}
                  className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
                  title="Edit habit"
                >
                  <svg
                    className="w-5 h-5 text-[var(--color-text-muted)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfirmId(habit.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete habit"
                >
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
              </Card>
            );
          })}
        </div>

        {/* Add Habit */}
        {showAddForm ? (
          <Card>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Habit name..."
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            />

            {/* Habit Type Selector */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setNewHabitType('positive')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  newHabitType === 'positive'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                + Positive
              </button>
              <button
                onClick={() => setNewHabitType('negative')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  newHabitType === 'negative'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                − Negative
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {newHabitType === 'positive'
                ? 'Positive: Track habits you want to build (e.g., Exercise, Read)'
                : 'Negative: Track habits you want to avoid (e.g., Smoking, Junk food)'}
            </p>

            <div className="flex gap-2 mt-3">
              <Button onClick={handleAddHabit} disabled={!newHabitName.trim() || isSaving}>
                Add Habit
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            + Add New Habit
          </Button>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-sm w-full">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Delete Habit?</h3>
              <p className="text-[var(--color-text-muted)] text-sm mb-4">
                This will permanently delete this habit and all its tracking data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
                <button
                  onClick={() => handleDeleteHabit(deleteConfirmId)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Habit Modal */}
        {editingHabit && (
          <EditHabitModal
            habit={editingHabit}
            onSave={handleEditHabit}
            onClose={() => setEditingHabit(null)}
            isSaving={isSaving}
          />
        )}
      </div>
    </AppLayout>
  );
}

interface EditHabitModalProps {
  habit: Habit;
  onSave: (habit: Habit, updates: { name: string; type: 'positive' | 'negative'; createdAt: string }) => void;
  onClose: () => void;
  isSaving: boolean;
}

function EditHabitModal({ habit, onSave, onClose, isSaving }: EditHabitModalProps) {
  const [name, setName] = useState(habit.name);
  const [type, setType] = useState<'positive' | 'negative'>(habit.type);
  const [createdAt, setCreatedAt] = useState(habit.createdAt.split('T')[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(habit, {
      name: name.trim(),
      type,
      createdAt: new Date(createdAt + 'T00:00:00').toISOString(),
    });
  };

  // Get today's date in YYYY-MM-DD format for max date
  const today = formatDate(new Date());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-sm w-full">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Edit Habit</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Habit Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('positive')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  type === 'positive'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                + Positive
              </button>
              <button
                onClick={() => setType('negative')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  type === 'negative'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                − Negative
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Created Date
            </label>
            <input
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              max={today}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Days before this date will show as grey in the calendar
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || isSaving}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
