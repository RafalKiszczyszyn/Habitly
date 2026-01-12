import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Button, Card } from '../components/ui';
import { useHabitStore } from '../stores/habit-store';
import { formatDate } from '../lib/calendar';
import type { Habit } from '../types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function ManageHabitsPage() {
  const navigate = useNavigate();
  const { habits, addHabit, updateHabit, deleteHabit } =
    useHabitStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<'positive' | 'negative'>('positive');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;

    const habit: Habit = {
      id: generateId(),
      name: newHabitName.trim(),
      type: newHabitType,
      frequency: 'daily',
      color: COLORS[habits.length % COLORS.length],
      createdAt: new Date().toISOString(),
      archived: false,
      unit: newHabitUnit.trim() || undefined,
    };

    addHabit(habit);
    setNewHabitName('');
    setNewHabitType('positive');
    setNewHabitUnit('');
    setShowAddForm(false);
  };

  const handleDeleteHabit = (habitId: string) => {
    deleteHabit(habitId);
    setDeleteConfirmId(null);
  };

  const handleEditHabit = (habit: Habit, updates: { name: string; type: 'positive' | 'negative'; createdAt: string; unit?: string }) => {
    updateHabit(habit.id, updates);
    setEditingHabit(null);
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
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Manage Your Habits</h1>
        </div>

        {/* Habits List */}
        <div className="space-y-3">
          {activeHabits.length === 0 ? (
            <Card>
              <p className="text-center text-[var(--color-text-muted)]">
                No habits yet. Add your first habit below!
              </p>
            </Card>
          ) : (
            activeHabits.map((habit) => (
              <Card key={habit.id} className="flex items-center gap-4">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: habit.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
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
                      {habit.type === 'positive' ? '+' : '−'}
                    </span>
                    {habit.unit && (
                      <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {habit.unit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Created {new Date(habit.createdAt).toLocaleDateString()}
                  </p>
                </div>
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
              </Card>
            ))
          )}
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
                - Negative
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              {newHabitType === 'positive'
                ? 'Positive: Track habits you want to build (e.g., Exercise, Read)'
                : 'Negative: Track habits you want to avoid (e.g., Smoking, Junk food)'}
            </p>

            {/* Unit Input */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                Unit (optional)
              </label>
              <input
                type="text"
                value={newHabitUnit}
                onChange={(e) => setNewHabitUnit(e.target.value)}
                placeholder="e.g., glasses, minutes, doses..."
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                If set, you can track how many units per occurrence
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              <Button onClick={handleAddHabit} disabled={!newHabitName.trim()}>
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
          />
        )}
      </div>
    </AppLayout>
  );
}

interface EditHabitModalProps {
  habit: Habit;
  onSave: (habit: Habit, updates: { name: string; type: 'positive' | 'negative'; createdAt: string; unit?: string }) => void;
  onClose: () => void;
}

function EditHabitModal({ habit, onSave, onClose }: EditHabitModalProps) {
  const [name, setName] = useState(habit.name);
  const [type, setType] = useState<'positive' | 'negative'>(habit.type);
  const [createdAt, setCreatedAt] = useState(formatDate(new Date(habit.createdAt)));
  const [unit, setUnit] = useState(habit.unit || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave(habit, {
      name: name.trim(),
      type,
      createdAt: new Date(createdAt + 'T00:00:00').toISOString(),
      unit: unit.trim() || undefined,
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
                - Negative
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

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
              Unit (optional)
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., glasses, minutes, doses..."
              className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              If set, you can track how many units per occurrence
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
