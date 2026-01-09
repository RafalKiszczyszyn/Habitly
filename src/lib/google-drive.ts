import type { Habit, HabitEntry, HabitData } from '../types';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';
const DATA_FILE_NAME = 'habitly-data.json';

async function findDataFile(accessToken: string): Promise<string | null> {
  const response = await fetch(
    `${DRIVE_API_URL}/files?spaces=appDataFolder&q=name='${DATA_FILE_NAME}'&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to search for data file');
  }

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

  if (!response.ok) {
    throw new Error('Failed to load habit data');
  }

  return response.json();
}

export async function saveHabitData(accessToken: string, data: HabitData): Promise<void> {
  const fileId = await findDataFile(accessToken);
  const dataWithTimestamp = { ...data, lastSyncedAt: new Date().toISOString() };
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

    if (!response.ok) {
      throw new Error('Failed to update habit data');
    }
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

    if (!response.ok) {
      throw new Error('Failed to create habit data file');
    }
  }
}

export function getDefaultHabitData(): HabitData {
  return {
    habits: [],
    entries: [],
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

  return {
    habits: migratedHabits,
    entries: migratedEntries,
    lastSyncedAt: (data.lastSyncedAt as string) || new Date().toISOString(),
  };
}
