import { Button, Card } from './ui';
import type { HabitData } from '../types';

type VersionButtonProps = { data: HabitData; label: string; onClick: () => void; isPrimary: boolean };

function VersionButton({data, label, onClick, isPrimary}: VersionButtonProps) {
  const baseClasses = 'p-3 rounded-lg border border-[var(--color-border)] cursor-pointer';
  const primaryButtonClasses = 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus:ring-[var(--color-primary)]';
  const primaryTextClasses = 'text-white/80';
  const secondaryButtonClasses = 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]';
  const secondaryTextClasses = 'text-[var(--color-text-muted)]';

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${isPrimary ? primaryButtonClasses : secondaryButtonClasses}`}
    >
      <div className="font-medium text-sm">{label}</div>
      <div className={`text-xs mt-1 ${isPrimary ? primaryTextClasses : secondaryTextClasses}`}>
        Last synced: {new Date(data.lastSyncedAt).toLocaleString()}
      </div>
      <div className={`text-xs ${isPrimary ? primaryTextClasses : secondaryTextClasses}`}>
        {data.habits.length} habits, {data.entries.length} entries, {data.goals.length} goals
      </div>
    </div>
  );

}

interface SyncConflictModalProps {
  cloudData: HabitData;
  localData: HabitData;
  onKeepLocal: () => void;
  onKeepCloud: () => void;
  onCancel: () => void;
  primaryAction?: 'local' | 'cloud';
}

export function SyncConflictModal({
  cloudData,
  localData,
  onKeepLocal,
  onKeepCloud,
  onCancel,
  primaryAction = 'local',
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
          <VersionButton data={cloudData} label="Cloud Data" onClick={onKeepCloud} isPrimary={primaryAction === 'cloud'} />
          <VersionButton data={localData} label="Local Data" onClick={onKeepLocal} isPrimary={primaryAction === 'local'} />
        </div>

        <div className="flex gap-2">
          <Button
            variant={'secondary'}
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
