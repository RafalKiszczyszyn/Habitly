import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { formatDate, getCoveredPeriods, type Period } from '../lib/calendar';

interface DateRange {
  start: Date;
  end: Date;
}

interface Periods {
  days: number,
  weeks: Period[],
  months: Period[],
  years: Period[]
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
  unitsPerYear: number;
  unitsPerMonth: number;
  unitsPerWeek: number;
  unitsPerDay: number;
}

type ChartPeriod = 'days' | 'weeks' | 'months' | 'years';
type ChartMeasure = 'occurrences' | 'units';

interface ChartDataPoint {
  label: string;
  value: number;
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

function periodsText(name: string, count: number): string {
  if (count === 0) return '';
  if (count === 1) return `${count} ${name}`;
  return `${count} ${name}s`;
}

function selectedPeriodsText(periods: Periods): string {
  return `${periodsText('year', periods.years.length)}, ${periodsText('month', periods.months.length)}, ` + 
    `${periodsText('week', periods.weeks.length)}, and ${periodsText('day', periods.days)}`
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

  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('weeks');
  const [chartMeasure, setChartMeasure] = useState<ChartMeasure>('occurrences');
  const [chartScrollIndex, setChartScrollIndex] = useState(0);
  const CHART_VISIBLE_ITEMS = 12;

  const periods = useMemo(() => {
    return {
      days: daysBetween(dateRange.start, dateRange.end),
      weeks: getCoveredPeriods(dateRange.start, dateRange.end, 'week'),
      months: getCoveredPeriods(dateRange.start, dateRange.end, 'month'),
      years: getCoveredPeriods(dateRange.start, dateRange.end, 'year'),
    }
  }, [entries, habitId, dateRange])

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
    const totalWeeks = periods.weeks.length;
    const totalMonths = periods.months.length;
    const totalYears = periods.years.length;

    const occurrences = filteredEntries.length;
    const totalUnits = filteredEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0);

    return {
      daysPerYear: totalYears > 0 ? occurrences / totalYears : 0,
      daysPerMonth: totalMonths > 0 ? occurrences / totalMonths : 0,
      daysPerWeek: totalWeeks > 0 ? occurrences / totalWeeks : 0,
      unitsPerYear: totalYears > 0 ? totalUnits / totalYears : 0,
      unitsPerMonth: totalMonths > 0 ? totalUnits / totalMonths : 0,
      unitsPerWeek: totalWeeks > 0 ? totalUnits / totalWeeks : 0,
      unitsPerDay: periods.days > 0 ? totalUnits / periods.days : 0,
    };
  }, [filteredEntries, dateRange]);

  // Calculate chart data based on selected period and measure
  const chartData = useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];

    const formatPeriodLabel = (date: Date, period: ChartPeriod): string => {
      if (period === 'days') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (period === 'weeks') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (period === 'months') {
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear().toString().slice(-2)}`;
      } else {
        return date.getFullYear().toString();
      }
    };

    const isDateInPeriod = (entryDateStr: string, periodStart: Date, periodEnd: Date): boolean => {
      const entryDate = new Date(entryDateStr);
      entryDate.setHours(0, 0, 0, 0);
      const start = new Date(periodStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(periodEnd);
      end.setHours(23, 59, 59, 999);
      return entryDate >= start && entryDate <= end;
    };

    const calculateValue = (periodStart: Date, periodEnd: Date): number => {
      const periodEntries = filteredEntries.filter((e) =>
        isDateInPeriod(e.date, periodStart, periodEnd)
      );
      if (chartMeasure === 'occurrences') {
        return periodEntries.length;
      } else {
        return periodEntries.reduce((sum, e) => sum + (e.amount ?? 1), 0);
      }
    };

    if (chartPeriod === 'days') {
      // Generate each day in the range
      const current = new Date(dateRange.start);
      current.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const dayStart = new Date(current);
        const dayEnd = new Date(current);
        data.push({
          label: formatPeriodLabel(dayStart, 'days'),
          value: calculateValue(dayStart, dayEnd),
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (chartPeriod === 'weeks') {
      periods.weeks.forEach((period) => {
        data.push({
          label: formatPeriodLabel(period.start, 'weeks'),
          value: calculateValue(period.start, period.end),
        });
      });
    } else if (chartPeriod === 'months') {
      periods.months.forEach((period) => {
        data.push({
          label: formatPeriodLabel(period.start, 'months'),
          value: calculateValue(period.start, period.end),
        });
      });
    } else if (chartPeriod === 'years') {
      periods.years.forEach((period) => {
        data.push({
          label: formatPeriodLabel(period.start, 'years'),
          value: calculateValue(period.start, period.end),
        });
      });
    }

    return data;
  }, [filteredEntries, chartPeriod, chartMeasure, dateRange, periods]);

  const maxChartValue = useMemo(() => {
    return Math.max(...chartData.map((d) => d.value), 1);
  }, [chartData]);

  // Reset scroll when data changes
  useEffect(() => {
    setChartScrollIndex(0);
  }, [chartPeriod, dateRange]);

  const visibleChartData = useMemo(() => {
    const endIndex = Math.min(chartScrollIndex + CHART_VISIBLE_ITEMS, chartData.length);
    return chartData.slice(chartScrollIndex, endIndex);
  }, [chartData, chartScrollIndex]);

  const canScrollLeft = chartScrollIndex > 0;
  const canScrollRight = chartScrollIndex + CHART_VISIBLE_ITEMS < chartData.length;

  const scrollChart = (direction: 'left' | 'right') => {
    if (direction === 'left' && canScrollLeft) {
      setChartScrollIndex(Math.max(0, chartScrollIndex - CHART_VISIBLE_ITEMS));
    } else if (direction === 'right' && canScrollRight) {
      setChartScrollIndex(Math.min(chartData.length - CHART_VISIBLE_ITEMS, chartScrollIndex + CHART_VISIBLE_ITEMS));
    }
  };

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
            {selectedPeriodsText(periods)} selected
          </p>
        </Card>

        {/* Chart Section */}
        <Card>
          <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Activity Chart</h3>

          {/* Period and Measure Selectors */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Period</label>
              <select
                value={chartPeriod}
                onChange={(e) => setChartPeriod(e.target.value as ChartPeriod)}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Measure</label>
              <select
                value={chartMeasure}
                onChange={(e) => setChartMeasure(e.target.value as ChartMeasure)}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)]"
              >
                <option value="occurrences">Occurrences</option>
                {hasUnits && <option value="units">{unitLabel}</option>}
              </select>
            </div>
          </div>

          {/* Bar Chart */}
          {chartData.length > 0 ? (
            <div>
              {/* Navigation buttons */}
              {chartData.length > CHART_VISIBLE_ITEMS && (
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => scrollChart('left')}
                    disabled={!canScrollLeft}
                    className="p-1 rounded hover:bg-[var(--color-background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {chartScrollIndex + 1}-{Math.min(chartScrollIndex + CHART_VISIBLE_ITEMS, chartData.length)} of {chartData.length}
                  </span>
                  <button
                    onClick={() => scrollChart('right')}
                    disabled={!canScrollRight}
                    className="p-1 rounded hover:bg-[var(--color-background)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Recharts Bar Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visibleChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      domain={[0, maxChartValue]}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'var(--color-text)', fontWeight: 500 }}
                      itemStyle={{ color: 'var(--color-text-muted)' }}
                      formatter={(value) => [value ?? 0, chartMeasure === 'occurrences' ? 'Occurrences' : unitLabel]}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {visibleChartData.map((_, index) => (
                        <Cell key={index} fill={habit.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              No data for selected range
            </p>
          )}
        </Card>

        {/* Averages Section */}
        <Card>
          <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Averages</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Based on selected date range ({selectedPeriodsText(periods)})
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
