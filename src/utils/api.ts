import { Contact, Settings } from '../types';
import * as Localization from 'expo-localization';

const CN_SERVER_URL = 'https://chongyetech.com';
const INT_SERVER_URL =
  (process.env.EXPO_PUBLIC_SERVER_URL as string | undefined) ??
  'http://localhost:3000';

// 设备地区是否为中国大陆（用于双服务器路由，以及仅在中国区显示 ICP 备案号）
export function isChinaRegion(): boolean {
  try {
    return Localization.getLocales()[0]?.regionCode === 'CN';
  } catch {
    return false;
  }
}

const SERVER_URL = isChinaRegion() ? CN_SERVER_URL : INT_SERVER_URL;

const TIMEOUT_MS = 8000;

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true',
};

// Retry with backoff so a transient network blip doesn't silently drop a
// settings / contacts / check-in sync (a safety app must not lose these).
// The app still works fully offline; this just makes best-effort sync far more
// reliable. Returns true only if the server actually accepted the request.
const RETRY_BACKOFF_MS = [1000, 3000, 8000];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function post(path: string, body: object): Promise<boolean> {
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${SERVER_URL}${path}`, {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return true;
      // 4xx = client/validation error; retrying won't help.
      if (res.status >= 400 && res.status < 500) return false;
      // 5xx falls through to retry.
    } catch {
      // Network error / timeout — fall through to retry.
    }
    if (attempt < RETRY_BACKOFF_MS.length) await wait(RETRY_BACKOFF_MS[attempt]);
  }
  return false;
}

export async function apiCheckIn(
  deviceId: string,
  location?: { latitude: number; longitude: number }
): Promise<boolean> {
  return post('/api/checkin', { deviceId, location, timestamp: Date.now() });
}

export async function apiSyncContacts(
  deviceId: string,
  contacts: Contact[]
): Promise<boolean> {
  return post('/api/contacts', { deviceId, contacts });
}

export async function apiSyncSettings(
  deviceId: string,
  settings: Settings,
  language?: string,
  isPremium?: boolean
): Promise<boolean> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return post('/api/settings', {
    deviceId,
    settings: { ...settings, language: language ?? 'en', isPremium: isPremium ?? false, timezone },
  });
}

export async function apiDeleteDevice(deviceId: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    await fetch(`${SERVER_URL}/api/device/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: BASE_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Best-effort
  }
}

export async function apiFetchNotifications(deviceId: string): Promise<NotificationRecord[]> {
  try {
    const res = await fetch(`${SERVER_URL}/api/notifications/${encodeURIComponent(deviceId)}`, {
      headers: BASE_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface NotificationRecord {
  id: number;
  device_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  level: number;
  sent_at: number;
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
