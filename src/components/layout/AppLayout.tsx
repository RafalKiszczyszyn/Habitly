import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useHabitStore } from '../../stores/habit-store';
import { signOut } from '../../lib/google-auth';
import { SyncConflictModal } from '../SyncConflictModal';
import { SyncMenu } from './SyncMenu';
import { MessagePopup } from '../ui';
import { useSync } from '../../hooks/useSync';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, accessToken, isLocalUser, clearAuth } = useAuthStore();
  const { clearHabitData, isLoading, setLoading, lastSyncedAt } = useHabitStore();

  const {
    isSyncing,
    syncConflict,
    isDownloadMode,
    message,
    clearMessage,
    handleConnectToCloud,
    handleSync,
    handleDownload,
    handleKeepLocal,
    handleKeepCloud,
  } = useSync();

  const handleSignOut = () => {
    signOut();
    clearAuth();
    clearHabitData();
    navigate('/login');
  };

  useEffect(() => setLoading(isSyncing), [isSyncing])

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Habitly
            <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">{__APP_VERSION__}</span>
          </h1>
          <SyncMenu
            user={user}
            accessToken={accessToken}
            isLocalUser={isLocalUser}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            onConnectToCloud={handleConnectToCloud}
            onSync={handleSync}
            onDownload={handleDownload}
            onSignOut={handleSignOut}
          />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-[var(--color-text-muted)]">Loading your data...</p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Sync Conflict Modal */}
      {syncConflict && (
        <SyncConflictModal
          cloudData={syncConflict.cloud}
          localData={syncConflict.local}
          onKeepLocal={handleKeepLocal}
          onKeepCloud={handleKeepCloud}
          primaryAction={isDownloadMode ? 'cloud' : 'local'}
        />
      )}

      {/* Message Popup */}
      {message && (
        <MessagePopup
          message={message.text}
          type={message.type}
          onClose={clearMessage}
        />
      )}
    </div>
  );
}
