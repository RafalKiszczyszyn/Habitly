import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { formatDate } from '../lib/calendar';

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
  const { habits, entries, toggleEntry, setEntry } =
    useHabitStore();
  const [amountInputHabitId, setAmountInputHabitId] = useState<string | null>(null);
  const [amountInputValue, setAmountInputValue] = useState('');

  // Read date from URL or default to today
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => parseDate(dateParam));

  const selectedDateStr = formatDate(selectedDate);

  const handleToggle = (habitId: string) => {
    toggleEntry(habitId, selectedDateStr);
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

  // Get entry for a habit on selected date
  const getEntry = (habitId: string) => {
    return entries.find(
      (e) => e.habitId === habitId && e.date === selectedDateStr
    );
  };

  // Check if an entry exists for selected date and occurred is true
  const hasOccurred = (habitId: string): boolean => {
    const entry = getEntry(habitId);
    return entry?.occurred ?? false;
  };

  // Get amount for a habit on selected date
  const getAmount = (habitId: string): number | undefined => {
    const entry = getEntry(habitId);
    return entry?.amount;
  };

  // Handle click for habits with units - open amount input
  const handleUnitHabitClick = (habitId: string) => {
    const entry = getEntry(habitId);
    setAmountInputHabitId(habitId);
    setAmountInputValue(entry?.amount?.toString() || '');
  };

  // Save amount and close input
  const handleSaveAmount = (occurred: boolean) => {
    if (!amountInputHabitId) return;
    const amount = amountInputValue ? parseFloat(amountInputValue) : undefined;
    setEntry(amountInputHabitId, selectedDateStr, occurred, amount);
    setAmountInputHabitId(null);
    setAmountInputValue('');
  };

  // Determine if a habit is "successful" on selected date
  // Positive: occurred = success (green)
  // Negative: NOT occurred = success (green)
  const isSuccess = (habit: { id: string; type: 'positive' | 'negative' }): boolean => {
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
          {activeHabits.length === 0 ? (
            <Card>
              <p className="text-center text-[var(--color-text-muted)]">
                No habits yet. Add your first habit to get started!
              </p>
            </Card>
          ) : (
            activeHabits.map((habit) => {
              const occurred = hasOccurred(habit.id);
              const success = isSuccess(habit);
              const amount = getAmount(habit.id);
              const hasUnit = !!habit.unit;

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

              const handleClick = hasUnit
                ? () => handleUnitHabitClick(habit.id)
                : () => handleToggle(habit.id);

              return (
                <Card key={habit.id} className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${checkboxStyle}`}
                    onClick={handleClick}
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
                    onClick={handleClick}
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
                      {hasUnit && occurred && amount !== undefined && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {amount} {habit.unit}
                        </span>
                      )}
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
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                </Card>
              );
            })
          )}
        </div>

        {/* Manage Habits Button */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => navigate('/manage')}
        >
          Manage Your Habits
        </Button>

        {/* Amount Input Modal */}
        {amountInputHabitId && (() => {
          const habit = habits.find(h => h.id === amountInputHabitId);
          if (!habit) return null;
          const entry = getEntry(amountInputHabitId);

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="max-w-sm w-full">
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  {habit.name}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                    How many {habit.unit}?
                  </label>
                  <input
                    type="number"
                    value={amountInputValue}
                    onChange={(e) => setAmountInputValue(e.target.value)}
                    placeholder="Enter amount..."
                    min="0"
                    step="any"
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setAmountInputHabitId(null);
                      setAmountInputValue('');
                    }}
                  >
                    Cancel
                  </Button>
                  {entry?.occurred && (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => handleSaveAmount(false)}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    className="flex-1"
                    onClick={() => handleSaveAmount(true)}
                  >
                    Save
                  </Button>
                </div>
              </Card>
            </div>
          );
        })()}
      </div>
    </AppLayout>
  );
}
