import type { Habit, HabitEntry, HabitData, Goal } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';
const DATA_FILE_NAME = 'habitly-data.json';

export class TokenExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'TokenExpiredError';
  }
}

export class SyncConflictError extends Error {
  cloudData: HabitData;
  localData: HabitData;

  constructor(cloudData: HabitData, localData: HabitData) {
    super('Sync conflict detected');
    this.name = 'SyncConflictError';
    this.cloudData = cloudData;
    this.localData = localData;
  }
}

function checkResponse(response: Response, errorMessage: string): void {
  if (response.status === 401) {
    throw new TokenExpiredError();
  }
  if (!response.ok) {
    throw new Error(errorMessage);
  }
}

async function findDataFile(accessToken: string): Promise<string | null> {
  const response = await fetch(
    `${DRIVE_API_URL}/files?spaces=appDataFolder&q=name='${DATA_FILE_NAME}'&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  checkResponse(response, 'Failed to search for data file');

  const data = await response.json();
  return data.files?.[0]?.id || null;
}

export async function loadHabitData(accessToken: string): Promise<Record<string, unknown> | null> {
  const fileId = await findDataFile(accessToken);

  if (!fileId) {
    return null;
  }

  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  checkResponse(response, 'Failed to load habit data');

  return response.json();
}

async function writeHabitData(accessToken: string, data: HabitData, fileId: string | null): Promise<string> {
  const newSyncedAt = new Date().toISOString();
  const dataWithTimestamp = { ...data, lastSyncedAt: newSyncedAt };
  const body = JSON.stringify(dataWithTimestamp);

  if (fileId) {
    // Update existing file
    const response = await fetch(`${UPLOAD_API_URL}/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    checkResponse(response, 'Failed to update habit data');
  } else {
    // Create new file
    const metadata = {
      name: DATA_FILE_NAME,
      parents: ['appDataFolder'],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([body], { type: 'application/json' }));

    const response = await fetch(`${UPLOAD_API_URL}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    checkResponse(response, 'Failed to create habit data file');
  }

  return newSyncedAt;
}

export async function saveHabitData(accessToken: string, data: HabitData): Promise<string> {
  const fileId = await findDataFile(accessToken);

  // Check for conflicts if file exists
  if (fileId) {
    const response = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    checkResponse(response, 'Failed to check cloud data');

    const cloudData = migrateHabitData(await response.json());
    const localSyncTime = new Date(data.lastSyncedAt).getTime();
    const cloudSyncTime = new Date(cloudData.lastSyncedAt).getTime();

    // If cloud has newer data, throw conflict error
    if (cloudSyncTime > localSyncTime) {
      throw new SyncConflictError(cloudData, data);
    }
  }

  return writeHabitData(accessToken, data, fileId);
}

// Force save without conflict check (when user chooses to overwrite cloud)
export async function forceSaveHabitData(accessToken: string, data: HabitData): Promise<string> {
  const fileId = await findDataFile(accessToken);
  return writeHabitData(accessToken, data, fileId);
}

export function getDefaultHabitData(): HabitData {
  return {
    habits: [],
    entries: [],
    goals: [],
    lastSyncedAt: new Date().toISOString(),
  };
}

// Migrate old data format (completions) to new format (entries)
export function migrateHabitData(data: Record<string, unknown>): HabitData {
  const habits = (data.habits as Habit[] | undefined) || [];
  const migratedHabits = habits.map((h) => ({
    ...h,
    type: h.type || 'positive', // Default old habits to positive
  })) as Habit[];

  // Handle old 'completions' field
  const oldCompletions = data.completions as Array<{
    habitId: string;
    date: string;
    completed?: boolean;
    occurred?: boolean;
    note?: string;
  }> | undefined;

  const entries = data.entries as HabitEntry[] | undefined;

  let migratedEntries: HabitEntry[] = [];

  if (entries) {
    migratedEntries = entries;
  } else if (oldCompletions) {
    migratedEntries = oldCompletions.map((c) => ({
      habitId: c.habitId,
      date: c.date,
      occurred: c.occurred ?? c.completed ?? false,
      note: c.note,
    }));
  }

  const goals = (data.goals as Goal[] | undefined) || [];

  return {
    habits: migratedHabits,
    entries: migratedEntries,
    goals,
    lastSyncedAt: (data.lastSyncedAt as string) || new Date().toISOString(),
  };
}
