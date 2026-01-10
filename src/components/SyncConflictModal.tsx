import { Button, Card } from './ui';
import type { HabitData } from '../types';

interface SyncConflictModalProps {
  cloudData: HabitData;
  localData: HabitData;
  onKeepLocal: () => void;
  onKeepCloud: () => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export function SyncConflictModal({
  cloudData,
  localData,
  onKeepLocal,
  onKeepCloud,
}: SyncConflictModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          Sync Conflict Detected
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-4">
          Your data was modified on another device. Which version would you like to keep?
        </p>

        <div className="space-y-3 mb-4">
          <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
            <div className="font-medium text-[var(--color-text)] text-sm">Cloud Data</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Last synced: {formatDate(cloudData.lastSyncedAt)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {cloudData.habits.length} habits, {cloudData.entries.length} entries
            </div>
          </div>

          <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
            <div className="font-medium text-[var(--color-text)] text-sm">Local Data</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Last synced: {formatDate(localData.lastSyncedAt)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {localData.habits.length} habits, {localData.entries.length} entries
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onKeepCloud}
          >
            Keep Cloud
          </Button>
          <Button
            className="flex-1"
            onClick={onKeepLocal}
          >
            Keep Local
          </Button>
        </div>
      </Card>
    </div>
  );
}
