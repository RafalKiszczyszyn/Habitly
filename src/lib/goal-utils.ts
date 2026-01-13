import type { Goal, Habit, HabitEntry, GoalPeriod } from '../types';

const PERIOD_DAYS: Record<GoalPeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
};

export interface CurrentPeriodProgress {
  value: number;
  targetValue: number;
  periodLabel: string;
}

export interface GoalCompletionResult {
  // For per_period goals
  metCount: number;
  totalPeriods: number;
  // For absolute goals
  absoluteValue: number;
  absoluteTarget: number;
  // Current period (if goal is active and we're in a period)
  currentPeriod: CurrentPeriodProgress | null;
  // Whether goal has started
  hasStarted: boolean;
  endDate: Date;
  status: 'success' | 'partial_success' | 'failure' | null,
  state: 'future' | 'active' | 'past'
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getPeriodsFromStart(
  startDate: string,
  period: GoalPeriod,
  periodCount: number,
): { start: Date; end: Date; isPast: boolean; isCurrent: boolean; isFuture: boolean }[] {
  const periods: { start: Date; end: Date; isPast: boolean; isCurrent: boolean; isFuture: boolean }[] = [];
  const periodDays = PERIOD_DAYS[period];
  const goalStart = new Date(startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateString(today);

  let currentPeriodStart = new Date(goalStart);

  while (periodCount > 0) {
    const periodEnd = addDays(currentPeriodStart, periodDays - 1);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStartStr = formatDateString(currentPeriodStart);
    const periodEndStr = formatDateString(periodEnd);

    const isPast = periodEndStr < todayStr;
    const isCurrent = periodStartStr <= todayStr && periodEndStr >= todayStr;
    const isFuture = periodStartStr > todayStr;

    periods.push({
      start: new Date(currentPeriodStart),
      end: periodEnd,
      isPast,
      isCurrent,
      isFuture,
    });

    // Move to next period
    currentPeriodStart = addDays(currentPeriodStart, periodDays);
    periodCount -= 1;
  }

  return periods;
}

export function calculateGoalCompletion(
  goal: Goal,
  habit: Habit,
  entries: HabitEntry[]
): GoalCompletionResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateString(today);
  const goalStart = new Date(goal.startDate + 'T00:00:00');

  const hasStarted = goalStart <= today;
  const periods = getPeriodsFromStart(goal.startDate, goal.period, goal.periodCount);
  const endDate = periods[periods.length - 1].end;
  const state = hasStarted
    ? today > endDate
      ? 'past'
      : 'active'
    : 'future'

  if (!hasStarted) {
    return {
      metCount: 0,
      totalPeriods: 0,
      absoluteValue: 0,
      absoluteTarget: goal.targetValue,
      currentPeriod: null,
      hasStarted: false,
      endDate,
      status: null,
      state
    };
  }

  // Get all entries for this habit from goal start until today
  const relevantEntries = entries.filter((e) => {
    if (e.habitId !== goal.habitId || !e.occurred) return false;
    return e.date >= goal.startDate && e.date <= todayStr;
  });


  // For absolute scope, we just need the total
  if (goal.targetScope === 'absolute') {
    // Calculate absolute value (total from start until today)
    let absoluteValue: number;
    if (goal.targetType === 'units') {
      absoluteValue = relevantEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0);
    } else {
      absoluteValue = relevantEntries.length;
    }

    if (habit.type === 'negative') {
      absoluteValue = Math.max(goal.targetValue - absoluteValue, 0)
    }
    
    const success = habit.type === 'negative' ? (absoluteValue > 0) : (absoluteValue >= goal.targetValue);
    return {
      metCount: 0,
      totalPeriods: 0,
      absoluteValue,
      absoluteTarget: goal.targetValue,
      currentPeriod: null,
      hasStarted: true,
      endDate,
      status: state === 'past' ? (success ? 'success' : 'failure') : null,
      state,
    };
  }

  let metCount = 0;
  let currentPeriod: CurrentPeriodProgress | null = null;

  for (const period of periods) {
    const periodStartStr = formatDateString(period.start);
    const periodEndStr = formatDateString(period.end);

    // Get entries within this period
    const periodEntries = relevantEntries.filter((e) =>
      e.date >= periodStartStr && e.date <= periodEndStr
    );

    // Calculate value based on target type
    let value: number;
    if (goal.targetType === 'units') {
      value = periodEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0);
    } else {
      value = periodEntries.length;
    }

    if (period.isCurrent) {
      if (habit.type === 'negative') {
        value = Math.max(goal.targetValue - value, 0)
      }
      currentPeriod = {
        value,
        targetValue: goal.targetValue,
        periodLabel: goal.period,
      };
    } else if (period.isPast) {
      // Check if target is met based on habit type
      let targetMet: boolean;
      if (habit.type === 'negative') {
        targetMet = value <= goal.targetValue;
      } else {
        targetMet = value >= goal.targetValue;
      }

      if (targetMet) {
        metCount++;
      }
    }
  }

  const status = metCount === goal.periodCount
    ? 'success'
    : metCount > 0
      ? 'partial_success'
      : 'failure';

  return {
    metCount,
    totalPeriods: goal.periodCount,
    absoluteValue: 0,
    absoluteTarget: goal.targetValue,
    currentPeriod,
    hasStarted: true,
    endDate,
    status: state === 'past' ? status : null,
    state
  };
}

export function getPeriodLabel(period: GoalPeriod, count: number): string {
  const labels: Record<GoalPeriod, { singular: string; plural: string }> = {
    day: { singular: 'day', plural: 'days' },
    week: { singular: 'week', plural: 'weeks' },
    month: { singular: 'month', plural: 'months' },
  };
  return count === 1 ? labels[period].singular : labels[period].plural;
}

export function getPeriodDays(period: GoalPeriod): number {
  return PERIOD_DAYS[period];
}
