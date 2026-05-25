import { Contact, Settings } from '../types';

const SERVER_URL =
  (process.env.EXPO_PUBLIC_SERVER_URL as string | undefined) ??
  'http://localhost:3000';

const TIMEOUT_MS = 8000;

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true',
};

async function post(path: string, body: object): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: BASE_HEADERS,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Server offline — app works fully offline, server sync is best-effort
  }
}

export async function apiCheckIn(
  deviceId: string,
  location?: { latitude: number; longitude: number }
): Promise<void> {
  await post('/api/checkin', { deviceId, location, timestamp: Date.now() });
}

export async function apiSyncContacts(
  deviceId: string,
  contacts: Contact[]
): Promise<void> {
  await post('/api/contacts', { deviceId, contacts });
}

export async function apiSyncSettings(
  deviceId: string,
  settings: Settings,
  language?: string,
  isPremium?: boolean
): Promise<void> {
  await post('/api/settings', {
    deviceId,
    settings: { ...settings, language: language ?? 'en', isPremium: isPremium ?? false },
  });
}

export async function apiPing(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/health`, {
      headers: BASE_HEADERS,
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
