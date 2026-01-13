import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { formatDate } from '../lib/calendar';

interface DateRange {
  start: Date;
  end: Date;
}

interface CurrentStats {
  daysYear: number;
  daysMonth: number;
  daysWeek: number;
  unitsYear: number;
  unitsMonth: number;
  unitsWeek: number;
}

interface AverageStats {
  daysPerYear: number;
  daysPerMonth: number;
  daysPerWeek: number;
  daysPerDay: number;
  unitsPerYear: number;
  unitsPerMonth: number;
  unitsPerWeek: number;
  unitsPerDay: number;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

// Count how many distinct years are covered by the date range
function yearsCovered(start: Date, end: Date): number {
  return end.getFullYear() - start.getFullYear() + 1;
}

// Count how many distinct months are covered by the date range
function monthsCovered(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
}

// Count how many distinct weeks are covered by the date range (weeks start on Sunday)
function weeksCovered(start: Date, end: Date): number {
  const startOfFirstWeek = getStartOfWeek(start);
  const startOfLastWeek = getStartOfWeek(end);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((startOfLastWeek.getTime() - startOfFirstWeek.getTime()) / msPerWeek) + 1;
}

export function StatisticsPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const { habits, entries } = useHabitStore();

  const habit = habits.find((h) => h.id === habitId);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const habitCreatedAt = useMemo(() => {
    if (!habit?.createdAt) return today;
    const d = new Date(habit.createdAt);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [habit?.createdAt]);

  const [dateRange, setDateRange] = useState<DateRange>({
    start: habitCreatedAt,
    end: today,
  });

  // Filter entries for this habit within the selected range
  const filteredEntries = useMemo(() => {
    if (!habitId) return [];
    return entries.filter((e) => {
      if (e.habitId !== habitId || !e.occurred) return false;
      const entryDate = new Date(e.date);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
  }, [entries, habitId, dateRange]);

  // Calculate current period stats (year, month, week from today)
  const currentStats = useMemo((): CurrentStats => {
    const startOfYear = getStartOfYear(today);
    const startOfMonth = getStartOfMonth(today);
    const startOfWeek = getStartOfWeek(today);

    let daysYear = 0, daysMonth = 0, daysWeek = 0;
    let unitsYear = 0, unitsMonth = 0, unitsWeek = 0;

    entries.forEach((e) => {
      if (e.habitId !== habitId || !e.occurred) return;
      const entryDate = new Date(e.date);
      const amount = e.amount ?? 1;

      if (entryDate >= startOfYear && entryDate <= today) {
        daysYear++;
        unitsYear += amount;
      }
      if (entryDate >= startOfMonth && entryDate <= today) {
        daysMonth++;
        unitsMonth += amount;
      }
      if (entryDate >= startOfWeek && entryDate <= today) {
        daysWeek++;
        unitsWeek += amount;
      }
    });

    return { daysYear, daysMonth, daysWeek, unitsYear, unitsMonth, unitsWeek };
  }, [entries, habitId]);

  // Calculate averages over the selected date range
  const averageStats = useMemo((): AverageStats => {
    const totalDays = daysBetween(dateRange.start, dateRange.end);
    const totalWeeks = weeksCovered(dateRange.start, dateRange.end);
    const totalMonths = monthsCovered(dateRange.start, dateRange.end);
    const totalYears = yearsCovered(dateRange.start, dateRange.end);

    const occurrences = filteredEntries.length;
    const totalUnits = filteredEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0);

    return {
      daysPerYear: totalYears > 0 ? occurrences / totalYears : 0,
      daysPerMonth: totalMonths > 0 ? occurrences / totalMonths : 0,
      daysPerWeek: totalWeeks > 0 ? occurrences / totalWeeks : 0,
      daysPerDay: totalDays > 0 ? occurrences / totalDays : 0,
      unitsPerYear: totalYears > 0 ? totalUnits / totalYears : 0,
      unitsPerMonth: totalMonths > 0 ? totalUnits / totalMonths : 0,
      unitsPerWeek: totalWeeks > 0 ? totalUnits / totalWeeks : 0,
      unitsPerDay: totalDays > 0 ? totalUnits / totalDays : 0,
    };
  }, [filteredEntries, dateRange]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    if (newStart <= dateRange.end && newStart >= habitCreatedAt) {
      setDateRange((prev) => ({ ...prev, start: newStart }));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    if (newEnd >= dateRange.start && newEnd <= today) {
      setDateRange((prev) => ({ ...prev, end: newEnd }));
    }
  };

  const resetToFullRange = () => {
    setDateRange({ start: habitCreatedAt, end: today });
  };

  const formatNumber = (n: number, decimals = 1): string => {
    if (n === 0) return '0';
    if (n < 0.1) return n.toFixed(2);
    return n.toFixed(decimals);
  };

  if (!habit) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">Habit not found</p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const hasUnits = !!habit.unit;
  const unitLabel = habit.unit || 'times';
  const actionLabel = habit.type === 'positive' ? 'completed' : 'occurred';

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
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
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">{habit.name}</h2>
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
            <p className="text-sm text-[var(--color-text-muted)]">Statistics</p>
          </div>
          <button
            onClick={() => navigate(`/calendar/${habitId}`)}
            className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
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
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
        </div>

        {/* Date Range Selector */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--color-text)]">Date Range</h3>
            <button
              onClick={resetToFullRange}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              Reset to full range
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">From</label>
              <input
                type="date"
                value={formatDate(dateRange.start)}
                min={formatDate(habitCreatedAt)}
                max={formatDate(dateRange.end)}
                onChange={handleStartDateChange}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">To</label>
              <input
                type="date"
                value={formatDate(dateRange.end)}
                min={formatDate(dateRange.start)}
                max={formatDate(today)}
                onChange={handleEndDateChange}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {daysBetween(dateRange.start, dateRange.end)} days selected
          </p>
        </Card>

        {/* Current Progress Section */}
        <Card>
          <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Current Progress</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Days {actionLabel} in current periods
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
              <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.daysYear}</p>
              <p className="text-xs text-[var(--color-text-muted)]">This Year</p>
            </div>
            <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
              <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.daysMonth}</p>
              <p className="text-xs text-[var(--color-text-muted)]">This Month</p>
            </div>
            <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
              <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.daysWeek}</p>
              <p className="text-xs text-[var(--color-text-muted)]">This Week</p>
            </div>
          </div>

          {hasUnits && (
            <>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)} in current periods
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.unitsYear}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">This Year</p>
                </div>
                <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.unitsMonth}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">This Month</p>
                </div>
                <div className="text-center p-3 bg-[var(--color-background)] rounded-lg">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{currentStats.unitsWeek}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">This Week</p>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Averages Section */}
        <Card>
          <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Averages</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Based on selected date range ({daysBetween(dateRange.start, dateRange.end)} days)
          </p>

          <div className="space-y-4">
            {/* Days averages */}
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Days {actionLabel}</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                  <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.daysPerYear)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">/ year</p>
                </div>
                <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                  <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.daysPerMonth)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">/ month</p>
                </div>
                <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                  <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.daysPerWeek)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">/ week</p>
                </div>
                <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                  <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.daysPerDay, 2)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">/ day</p>
                </div>
              </div>
            </div>

            {/* Units averages */}
            {hasUnits && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
                  {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.unitsPerYear)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">/ year</p>
                  </div>
                  <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.unitsPerMonth)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">/ month</p>
                  </div>
                  <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.unitsPerWeek)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">/ week</p>
                  </div>
                  <div className="text-center p-2 bg-[var(--color-background)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-text)]">{formatNumber(averageStats.unitsPerDay, 2)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">/ day</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Summary */}
        <Card>
          <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Total days {actionLabel}</span>
              <span className="font-medium text-[var(--color-text)]">{filteredEntries.length}</span>
            </div>
            {hasUnits && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Total {unitLabel}</span>
                <span className="font-medium text-[var(--color-text)]">
                  {filteredEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Tracking since</span>
              <span className="font-medium text-[var(--color-text)]">
                {habitCreatedAt.toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
