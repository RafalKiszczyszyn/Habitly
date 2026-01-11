import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useHabitStore } from '../../stores/habit-store';
import { signIn, signOut } from '../../lib/google-auth';
import { loadHabitData, saveHabitData, forceSaveHabitData, migrateHabitData, getDefaultHabitData, TokenExpiredError, SyncConflictError } from '../../lib/google-drive';
import { SyncConflictModal } from '../SyncConflictModal';
import type { HabitData } from '../../types';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const { getHabitData, setHabitData, clearHabitData, isLoading, setLoading } = useHabitStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncConflict, setSyncConflict] = useState<{ cloud: HabitData; local: HabitData } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignIn = async () => {
    try {
      const result = await signIn();
      if (result) {
        // Check if user changed (or no previous user)
        const userChanged = !user || user.id !== result.user.id;

        setAuth(result.user, result.accessToken);

        // Load data from cloud if user changed
        if (userChanged) {
          // Clear local data first if switching users
          if (user && user.id !== result.user.id) {
            clearHabitData();
          }

          setLoading(true);
          try {
            const cloudData = await loadHabitData(result.accessToken);
            if (cloudData) {
              setHabitData(migrateHabitData(cloudData));
            } else {
              setHabitData(getDefaultHabitData());
            }
          } catch (loadErr) {
            console.error('Failed to load cloud data:', loadErr);
            setHabitData(getDefaultHabitData());
          } finally {
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = () => {
    signOut();
    clearAuth();
    clearHabitData();
    setShowMenu(false);
    navigate('/login');
  };

  const handleSync = async () => {
    if (!accessToken) {
      // If not logged in, prompt sign in first
      await handleSignIn();
      return;
    }

    setIsSyncing(true);
    try {
      // First, try to load cloud data
      const cloudData = await loadHabitData(accessToken);
      const localData = getHabitData();

      if (cloudData) {
        const migratedCloud = migrateHabitData(cloudData);
        const cloudTime = new Date(migratedCloud.lastSyncedAt).getTime();
        const localTime = new Date(localData.lastSyncedAt).getTime();

        if (cloudTime > localTime) {
          // Cloud is newer - show conflict
          setSyncConflict({ cloud: migratedCloud, local: localData });
          return;
        }
      }

      // Save local data to cloud
      const newSyncedAt = await saveHabitData(accessToken, localData);
      setHabitData({ ...localData, lastSyncedAt: newSyncedAt });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        clearAuth();
        navigate('/login?expired=true');
        return;
      }
      if (error instanceof SyncConflictError) {
        setSyncConflict({ cloud: error.cloudData, local: error.localData });
        return;
      }
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepLocal = async () => {
    if (!accessToken || !syncConflict) return;
    setIsSyncing(true);
    try {
      const newSyncedAt = await forceSaveHabitData(accessToken, syncConflict.local);
      setHabitData({ ...syncConflict.local, lastSyncedAt: newSyncedAt });
      setSyncConflict(null);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        clearAuth();
        navigate('/login?expired=true');
      }
      console.error('Failed to save data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepCloud = () => {
    if (!syncConflict) return;
    setHabitData(syncConflict.cloud);
    setSyncConflict(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--color-text)]">Habitly</h1>
          <div className="relative">
            <button
              onClick={user ? () => setShowMenu(!showMenu) : handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
              title={user ? 'Cloud sync options' : 'Sign in & sync'}
            >
              {isSyncing ? (
                <svg className="w-5 h-5 animate-spin text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span className="text-sm text-[var(--color-text)]">
                {user ? 'Sync' : 'Sign in'}
              </span>
            </button>

            {/* Dropdown menu for logged in users */}
            {showMenu && user && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--color-border)]">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{user.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors disabled:opacity-50"
                >
                  Sync now
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-[var(--color-background)] transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
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
        />
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
