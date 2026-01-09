import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import {
  formatDate,
  getWeekDates,
  getMonthDates,
  getYearMonths,
  getMonthName,
  getShortMonthName,
  getDayName,
  isToday,
  isFutureDate,
} from '../lib/calendar';

type ViewMode = 'week' | 'month' | 'year';
type DayStatus = 'success' | 'failure' | 'no-data' | 'before-creation';

export function CalendarPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const { habits, entries } = useHabitStore();

  const habit = habits.find((h) => h.id === habitId);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const habitEntries = useMemo(() => {
    const map = new Map<string, boolean>();
    entries
      .filter((e) => e.habitId === habitId)
      .forEach((e) => map.set(e.date, e.occurred));
    return map;
  }, [entries, habitId]);

  // Get the status for a given date
  // Returns: 'success' (green), 'failure' (red), 'no-data' (grey for future), 'before-creation' (dark grey)
  const getDayStatus = (date: Date): DayStatus => {
    // Future dates are grey
    if (isFutureDate(date)) return 'no-data';

    // Check if date is before habit creation
    if (habit?.createdAt) {
      const createdDate = new Date(habit.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate < createdDate) return 'before-creation';
    }

    const dateStr = formatDate(date);
    const occurred = habitEntries.get(dateStr) ?? false;

    if (habit?.type === 'positive') {
      // Positive habit: occurred = success, not occurred = failure
      return occurred ? 'success' : 'failure';
    } else {
      // Negative habit: occurred = failure (did bad thing), not occurred = success (avoided it)
      return occurred ? 'failure' : 'success';
    }
  };

  const getStatusColor = (status: DayStatus): string => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failure':
        return 'bg-red-500';
      case 'no-data':
        return 'bg-gray-300 dark:bg-gray-600';
      case 'before-creation':
        return 'bg-gray-400 dark:bg-gray-700';
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const delta = direction === 'prev' ? -1 : 1;

    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + delta * 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + delta);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + delta);
        break;
    }

    setCurrentDate(newDate);
  };

  const handleDateClick = (date: Date) => {
    navigate(`/?date=${formatDate(date)}`);
  };

  const getPeriodLabel = (): string => {
    switch (viewMode) {
      case 'week': {
        const weekDates = getWeekDates(currentDate);
        const start = weekDates[0];
        const end = weekDates[6];
        if (start.getMonth() === end.getMonth()) {
          return `${getMonthName(start.getMonth())} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
        }
        return `${getShortMonthName(start.getMonth())} ${start.getDate()} - ${getShortMonthName(end.getMonth())} ${end.getDate()}, ${end.getFullYear()}`;
      }
      case 'month':
        return `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
      case 'year':
        return `${currentDate.getFullYear()}`;
    }
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

  // Legend labels based on habit type
  const successLabel = habit.type === 'positive' ? 'Done' : 'Avoided';
  const failureLabel = habit.type === 'positive' ? 'Missed' : 'Occurred';

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
            <p className="text-sm text-[var(--color-text-muted)]">Calendar</p>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
        </div>

        {/* View Mode Selector */}
        <Card className="p-2">
          <div className="flex gap-1">
            {(['week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)]'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigatePeriod('prev')}
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
          <span className="font-medium text-[var(--color-text)]">{getPeriodLabel()}</span>
          <button
            onClick={() => navigatePeriod('next')}
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Calendar View */}
        <Card>
          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              getDayStatus={getDayStatus}
              getStatusColor={getStatusColor}
              onDateClick={handleDateClick}
            />
          )}
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              getDayStatus={getDayStatus}
              getStatusColor={getStatusColor}
              onDateClick={handleDateClick}
            />
          )}
          {viewMode === 'year' && (
            <YearView
              currentDate={currentDate}
              getDayStatus={getDayStatus}
              getStatusColor={getStatusColor}
              onDateClick={handleDateClick}
            />
          )}
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-[var(--color-text-muted)]">{successLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[var(--color-text-muted)]">{failureLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-700" />
            <span className="text-[var(--color-text-muted)]">Before start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="text-[var(--color-text-muted)]">Future</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface ViewProps {
  currentDate: Date;
  getDayStatus: (date: Date) => DayStatus;
  getStatusColor: (status: DayStatus) => string;
  onDateClick: (date: Date) => void;
}

function WeekView({ currentDate, getDayStatus, getStatusColor, onDateClick }: ViewProps) {
  const weekDates = getWeekDates(currentDate);

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, index) => {
        const status = getDayStatus(date);
        const clickable = status !== 'no-data';
        return (
          <div key={index} className="text-center">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">
              {getDayName(date.getDay())}
            </div>
            <div
              onClick={() => clickable && onDateClick(date)}
              className={`aspect-square rounded-lg flex items-center justify-center ${getStatusColor(status)} ${
                isToday(date) ? 'ring-2 ring-[var(--color-primary)] ring-offset-2' : ''
              } ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              <span className="text-white font-medium text-sm">{date.getDate()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ currentDate, getDayStatus, getStatusColor, onDateClick }: ViewProps) {
  const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-[var(--color-text-muted)] py-1"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, index) => {
          if (!date) {
            return <div key={index} className="aspect-square" />;
          }

          const status = getDayStatus(date);
          const clickable = status !== 'no-data';
          return (
            <div
              key={index}
              onClick={() => clickable && onDateClick(date)}
              className={`aspect-square rounded-md flex items-center justify-center ${getStatusColor(status)} ${
                isToday(date) ? 'ring-2 ring-[var(--color-primary)] ring-offset-1' : ''
              } ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              <span className="text-white text-xs font-medium">{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ currentDate, getDayStatus, getStatusColor, onDateClick }: ViewProps) {
  const yearMonths = getYearMonths(currentDate.getFullYear());

  return (
    <div className="grid grid-cols-3 gap-4">
      {yearMonths.map(({ month, weeks }) => (
        <div key={month}>
          <div className="text-xs font-medium text-[var(--color-text)] mb-1 text-center">
            {getShortMonthName(month)}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {weeks.flat().map((date, index) => {
              if (!date) {
                return <div key={index} className="aspect-square" />;
              }

              const status = getDayStatus(date);
              const clickable = status !== 'no-data';
              return (
                <div
                  key={index}
                  onClick={() => clickable && onDateClick(date)}
                  className={`aspect-square rounded-sm ${getStatusColor(status)} ${
                    isToday(date) ? 'ring-1 ring-[var(--color-primary)]' : ''
                  } ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                  title={formatDate(date)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
