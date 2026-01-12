import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { formatDate } from '../lib/calendar';
import { calculateGoalCompletion, getPeriodLabel } from '../lib/goal-utils';
import type { Goal, Habit, HabitEntry, GoalTargetType, GoalPeriod, GoalTargetScope } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function GoalsPage() {
  const navigate = useNavigate();
  const { habits, entries, goals, addGoal, deleteGoal } = useHabitStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter out goals where habit was deleted or goal has units but habit lost its unit
  const visibleGoals = useMemo(() => {
    return goals
      .filter((goal) => {
        const habit = habits.find((h) => h.id === goal.habitId);
        if (!habit) return false;
        if (goal.targetType === 'units' && !habit.unit) return false;
        return true;
      })
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [goals, habits]);

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal(goalId);
    setDeleteConfirmId(null);
  };

  const handleAddGoal = (goalData: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    addGoal(newGoal);
    setShowAddModal(false);
  };

  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
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
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Goals</h1>
        </div>

        {/* Add Goal Button */}
        <Button
          onClick={() => setShowAddModal(true)}
          className="w-full"
          disabled={activeHabits.length === 0}
        >
          + Add Goal
        </Button>

        {activeHabits.length === 0 && (
          <p className="text-sm text-center text-[var(--color-text-muted)]">
            Create a habit first to add goals
          </p>
        )}

        {/* Goals List */}
        <div className="space-y-3">
          {visibleGoals.length === 0 ? (
            <Card>
              <p className="text-center text-[var(--color-text-muted)]">
                No goals yet. Add your first goal to start tracking!
              </p>
            </Card>
          ) : (
            visibleGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                habits={habits}
                entries={entries}
                onDelete={() => setDeleteConfirmId(goal.id)}
              />
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-sm w-full">
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Delete Goal?</h3>
              <p className="text-[var(--color-text-muted)] text-sm mb-4">
                This will permanently delete this goal. This action cannot be undone.
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
                  onClick={() => handleDeleteGoal(deleteConfirmId)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Add Goal Modal */}
        {showAddModal && (
          <AddGoalModal
            habits={activeHabits}
            onAdd={handleAddGoal}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

interface GoalCardProps {
  goal: Goal;
  habits: Habit[];
  entries: HabitEntry[];
  onDelete: () => void;
}

function GoalCard({ goal, habits, entries, onDelete }: GoalCardProps) {
  const habit = habits.find((h) => h.id === goal.habitId);
  if (!habit) return null;

  const completion = calculateGoalCompletion(goal, habit, entries);
  const periodLabel = getPeriodLabel(goal.period, completion.totalPeriods);

  const targetTypeLabel = goal.targetType === 'units' ? habit.unit : 'times';
  const limitWord = habit.type === 'negative' ? 'max' : 'min';

  // Build target description
  const targetDescription = goal.targetScope === 'absolute'
    ? `${limitWord} ${goal.targetValue} ${targetTypeLabel} total`
    : `${limitWord} ${goal.targetValue} ${targetTypeLabel} per ${goal.period}`;

  const badge = completion.metCount === completion.totalPeriods 
    ? { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Success' }
    : completion.metCount > 0
      ? { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', text: 'Partial Success' }
      : { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', text: 'Failure' }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Habit name with color dot */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <span className="font-medium text-[var(--color-text)] truncate">
              {habit.name}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                habit.type === 'positive'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {habit.type === 'positive' ? '+' : '-'}
            </span>
            { new Date() > completion.endDate && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  badge.style
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>

          {/* Goal target description */}
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {targetDescription}
          </p>

          {/* Start date */}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            From {new Date(goal.startDate).toLocaleDateString()} to {new Date(completion.endDate).toLocaleDateString()}
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete goal"
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
      </div>

      {/* Completion display */}
      <div className="pt-2 border-t border-[var(--color-border)]">
        {!completion.hasStarted ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center">
            Goal starts {new Date(goal.startDate).toLocaleDateString()}
          </p>
        ) : goal.targetScope === 'absolute' ? (
          // Absolute goal: show total progress
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">
                Total
              </span>
              <span className="text-lg font-semibold text-[var(--color-text)]">
                {completion.absoluteValue}/{completion.absoluteTarget} {targetTypeLabel}
              </span>
            </div>
            <div className="mt-2 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  habit.type === 'negative'
                    ? completion.absoluteValue <= completion.absoluteTarget
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : completion.absoluteValue >= completion.absoluteTarget
                    ? 'bg-green-500'
                    : 'bg-[var(--color-primary)]'
                }`}
                style={{
                  width: `${Math.min(100, (completion.absoluteValue / completion.absoluteTarget) * 100)}%`
                }}
              />
            </div>
          </>
        ) : (
          // Per-period goal: show periods met + current period
          <>
            {/* Current period progress */}
            {completion.currentPeriod && (
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    This {completion.currentPeriod.periodLabel}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {completion.currentPeriod.value}/{completion.currentPeriod.targetValue} {targetTypeLabel}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      habit.type === 'negative'
                        ? completion.currentPeriod.value <= completion.currentPeriod.targetValue
                          ? 'bg-green-500'
                          : 'bg-red-500'
                        : completion.currentPeriod.value >= completion.currentPeriod.targetValue
                        ? 'bg-green-500'
                        : 'bg-[var(--color-primary)]'
                    }`}
                    style={{
                      width: `${Math.min(100, (completion.currentPeriod.value / completion.currentPeriod.targetValue) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Past periods progress */}
            {completion.totalPeriods > 0 && (
              <div className={completion.currentPeriod ? 'pt-3 border-t border-[var(--color-border)]' : ''}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Targets met
                  </span>
                  <span className="text-lg font-semibold text-[var(--color-text)]">
                    {completion.metCount}/{completion.totalPeriods} {periodLabel}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      completion.metCount === completion.totalPeriods
                        ? 'bg-green-500'
                        : completion.metCount > 0
                        ? 'bg-[var(--color-primary)]'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${(completion.metCount / completion.totalPeriods) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* No past periods yet */}
            {!completion.hasStarted && (
              <p className="text-sm text-[var(--color-text-muted)] text-center">
                Goal starts {new Date(goal.startDate).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

interface AddGoalModalProps {
  habits: Habit[];
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

function AddGoalModal({ habits, onAdd, onClose }: AddGoalModalProps) {
  const today = formatDate(new Date());
  const [habitId, setHabitId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [periodCount, setPeriodCount] = useState<number>(1);
  const [targetType, setTargetType] = useState<GoalTargetType>('occurrences');
  const [targetScope, setTargetScope] = useState<GoalTargetScope>('per_period');
  const [targetValue, setTargetValue] = useState('');

  const selectedHabit = habits.find((h) => h.id === habitId);
  const hasUnit = selectedHabit?.unit;

  // Reset targetType if habit changes and doesn't have unit
  useEffect(() => {
    if (!hasUnit && targetType === 'units') {
      setTargetType('occurrences');
    }
  }, [habitId, hasUnit, targetType]);

  const handleSubmit = () => {
    if (!habitId || !startDate || !targetValue) return;

    onAdd({
      habitId,
      startDate,
      period,
      periodCount,
      targetType,
      targetScope,
      targetValue: parseFloat(targetValue),
    });
  };

  const isValid = habitId && startDate && targetValue && parseFloat(targetValue) > 0 && startDate >= today && periodCount > 0;

  const targetTypeLabel = targetType === 'units' ? selectedHabit?.unit : 'times';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-sm w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">
          Add Goal
        </h3>

        <div className="space-y-4">
          {/* Habit Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Habit
            </label>
            <select
              value={habitId}
              onChange={(e) => setHabitId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Select a habit...</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} {h.unit ? `(${h.unit})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Goal can only start today or in the future
            </p>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Period
            </label>
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as GoalPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    period === p
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {p === 'day' ? 'Day' : p === 'week' ? 'Week (7d)' : 'Month (30d)'}
                </button>
              ))}
            </div>
          </div>

          {/* Period Count */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Number of {period}s
            </label>
            <input
              type="number"
              value={periodCount}
              onChange={(e) => setPeriodCount(parseInt(e.target.value))}
              min="1"
              step="1"
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Target Type (only show if habit has unit) */}
          {hasUnit && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Track by
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetType('occurrences')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    targetType === 'occurrences'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  Occurrences
                </button>
                <button
                  onClick={() => setTargetType('units')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    targetType === 'units'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {selectedHabit?.unit}
                </button>
              </div>
            </div>
          )}

          {/* Target Scope */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Target type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetScope('per_period')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  targetScope === 'per_period'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Per {period}
              </button>
              <button
                onClick={() => setTargetScope('absolute')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                  targetScope === 'absolute'
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                Total
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {targetScope === 'per_period'
                ? `Target applies to each ${period} individually`
                : 'Target applies to the entire duration from start'}
            </p>
          </div>

          {/* Target Value */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              {selectedHabit?.type === 'negative' ? 'Maximum' : 'Minimum'} target
            </label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              min="0"
              step="any"
              placeholder={`Enter ${selectedHabit?.type === 'negative' ? 'max' : 'min'} value`}
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {selectedHabit && targetValue && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {selectedHabit.type === 'negative'
                  ? `Stay at or below ${targetValue} ${targetTypeLabel}${targetScope === 'per_period' ? ` per ${period}` : ' total'}`
                  : `Reach at least ${targetValue} ${targetTypeLabel}${targetScope === 'per_period' ? ` per ${period}` : ' total'}`}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Add Goal
          </Button>
        </div>
      </Card>
    </div>
  );
}
