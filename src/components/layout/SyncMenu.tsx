import { useState } from 'react';
import type { User } from '../../types';

interface SyncMenuProps {
  user: User | null;
  accessToken: string | null;
  isLocalUser: boolean;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onConnectToCloud: () => void;
  onSync: () => void;
  onDownload: () => void;
  onSignOut: () => void;
}

export function SyncMenu({
  user,
  accessToken,
  isLocalUser,
  lastSyncedAt,
  isSyncing,
  onConnectToCloud,
  onSync,
  onDownload,
  onSignOut,
}: SyncMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleButtonClick = () => {
    if (isLocalUser || !accessToken) {
      onConnectToCloud();
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleSync = () => {
    console.log('Syncing...');
    setShowMenu(false);
    onSync();
  };

  const handleDownload = () => {
    setShowMenu(false);
    onDownload();
  };

  const handleSignOut = () => {
    setShowMenu(false);
    onSignOut();
  };

  return (
    <>
      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0"
          onClick={() => setShowMenu(false)}
        />
      )}

      <div className="relative">
        <button
          onClick={handleButtonClick}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors disabled:opacity-50"
          title={isLocalUser ? 'Connect to cloud' : (accessToken ? 'Cloud sync options' : 'Connect to cloud')}
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
            {accessToken ? 'Sync' : 'Connect'}
          </span>
        </button>

        {/* Dropdown menu for cloud users */}
        {showMenu && accessToken && user && (
          <div className="absolute right-0 top-full mt-1 w-48 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">{user.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
              {lastSyncedAt && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Last synced: {new Date(lastSyncedAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors disabled:opacity-50"
            >
              Sync now
            </button>
            <button
              onClick={handleDownload}
              disabled={isSyncing}
              className="w-full px-3 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors disabled:opacity-50"
            >
              Download
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
    </>
  );
}
