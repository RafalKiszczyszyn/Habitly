import { useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useHabitStore } from '../stores/habit-store';
import { signIn as googleSignIn } from '../lib/google-auth';
import { loadHabitData, saveHabitData, forceSaveHabitData, TokenExpiredError, SyncConflictError } from '../lib/google-drive';
import { deepCompare } from '../lib/sync-utils';
import type { HabitData } from '../types';
import type { AddMessageFuncType } from './useToast';

interface SyncProps {
  onMessage: AddMessageFuncType;
}

export function useSync({ onMessage } : SyncProps) {
  const { accessToken, setLocalUser, setAuth } = useAuthStore();
  const { getHabitData, setHabitData } = useHabitStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncConflict, setSyncConflict] = useState<{ cloud: HabitData; local: HabitData } | null>(null);
  const [isDownloadMode, setIsDownloadMode] = useState(false);

  const handleExpiredSession = async () => {
    setLocalUser();
    onMessage(
      'Your session expired - switched to local mode. Reconnect to cloud to enable synchronization.',
      'warning'
    );
    setIsSyncing(false);
  };

  const handleConnectToCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuth(result.user, result.accessToken);
        const localData = getHabitData();
        const newSyncedAt = await saveHabitData(result.accessToken, localData);
        setHabitData({ ...localData, lastSyncedAt: newSyncedAt });
        onMessage('Uploaded local data to cloud', 'success');
      }
    } catch (error) {
      if (error instanceof SyncConflictError) {
        setSyncConflict({ cloud: error.cloudData, local: error.localData });
        return;
      }
      onMessage('Failed to connect to cloud', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);

    if (!accessToken) {
      await handleExpiredSession();
      return;
    }

    try {
      const localData = getHabitData();
      const newSyncedAt = await saveHabitData(accessToken, localData);
      setHabitData({ ...localData, lastSyncedAt: newSyncedAt });
      onMessage('Uploaded local data to cloud', 'success');
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      if (error instanceof SyncConflictError) {
        setSyncConflict({ cloud: error.cloudData, local: error.localData });
        return;
      }
      onMessage('Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    setIsSyncing(true);
    setIsDownloadMode(true);

    if (!accessToken) {
      await handleExpiredSession();
      return;
    }

    try {
      const cloudData = await loadHabitData(accessToken);
      const localData = getHabitData();

      if (cloudData) {
        // Local data may have the same sync timestamp as cloud data.
        // However, it can still be different if the user modified local data after the last sync.
        const equal = deepCompare(localData, cloudData);
        if (equal) {
          setHabitData(cloudData);
          setIsDownloadMode(false);
          onMessage('Downloaded cloud data', 'success');
        } else {
          setSyncConflict({ cloud: cloudData, local: localData });
        }
      } else {
        onMessage('No cloud data found', 'warning');
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      onMessage('Download failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepLocal = async () => {
    if (!syncConflict) return;

    if (isDownloadMode) {
      setSyncConflict(null);
      setIsDownloadMode(false);
      onMessage('Local data was kept', 'success');
      return;
    }

    setIsSyncing(true);

    if (!accessToken) {
      await handleExpiredSession();
      return;
    }

    try {
      const newSyncedAt = await forceSaveHabitData(accessToken, syncConflict.local);
      setHabitData({ ...syncConflict.local, lastSyncedAt: newSyncedAt });
      setSyncConflict(null);
      onMessage('Local data was kept', 'success');
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      onMessage('Failed to save data', 'warning');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepCloud = () => {
    if (!syncConflict) return;
    setHabitData(syncConflict.cloud);
    setSyncConflict(null);
    setIsDownloadMode(false);
    onMessage('Cloud data was kept', 'success');
  };

  return {
    isSyncing,
    syncConflict,
    isDownloadMode,
    handleConnectToCloud,
    handleSync,
    handleDownload,
    handleKeepLocal,
    handleKeepCloud,
  };
}
