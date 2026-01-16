import { useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { useHabitStore } from '../stores/habit-store';
import { signIn as googleSignIn } from '../lib/google-auth';
import { loadHabitData, saveHabitData, forceSaveHabitData, TokenExpiredError, SyncConflictError } from '../lib/google-drive';
import { deepCompare } from '../lib/sync-utils';
import type { HabitData } from '../types';

type Message = { text: string; type: 'error' | 'warning' | 'success' } | null;

export function useSync() {
  const { accessToken, setLocalUser, setAuth } = useAuthStore();
  const { getHabitData, setHabitData } = useHabitStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncConflict, setSyncConflict] = useState<{ cloud: HabitData; local: HabitData } | null>(null);
  const [isDownloadMode, setIsDownloadMode] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const handleExpiredSession = async () => {
    setLocalUser();
    setMessage({ 
      text: 'Your session expired - switched to local mode. Reconnect to cloud to enable synchronization.',
      type: 'warning'
    });
    setIsSyncing(false);
  };

  const handleConnectToCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuth(result.user, result.accessToken);

        const cloudData = await loadHabitData(result.accessToken);
        const localData = getHabitData();

        if (cloudData) {
          setSyncConflict({ cloud: cloudData, local: localData });
        } else {
          const newSyncedAt = await saveHabitData(result.accessToken, localData);
          setHabitData({ ...localData, lastSyncedAt: newSyncedAt });
        }
      }
    } catch {
      setMessage({ text: 'Failed to connect to cloud', type: 'error' });
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
      const cloudData = await loadHabitData(accessToken);
      const localData = getHabitData();

      if (cloudData) {
        const cloudTime = new Date(cloudData.lastSyncedAt).getTime();
        const localTime = new Date(localData.lastSyncedAt).getTime();

        if (cloudTime > localTime) {
          setSyncConflict({ cloud: cloudData, local: localData });
          return;
        }
      }

      const newSyncedAt = await saveHabitData(accessToken, localData);
      setHabitData({ ...localData, lastSyncedAt: newSyncedAt });
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      if (error instanceof SyncConflictError) {
        setSyncConflict({ cloud: error.cloudData, local: error.localData });
        return;
      }
      setMessage({ text: 'Sync failed', type: 'error' });
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
        const equal = deepCompare(localData, cloudData);
        if (equal) {
          setHabitData(cloudData);
          setIsDownloadMode(false);
        } else {
          setSyncConflict({ cloud: cloudData, local: localData });
        }
      } else {
        setMessage({ text: 'No cloud data found', type: 'warning' });
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      setMessage({ text: 'Download failed', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepLocal = async () => {
    if (!syncConflict) return;

    if (isDownloadMode) {
      setSyncConflict(null);
      setIsDownloadMode(false);
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
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        await handleExpiredSession();
        return;
      }
      setMessage({ text: 'Failed to save data', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepCloud = () => {
    if (!syncConflict) return;
    setHabitData(syncConflict.cloud);
    setSyncConflict(null);
    setIsDownloadMode(false);
  };

  const clearMessage = () => setMessage(null);

  return {
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
  };
}
