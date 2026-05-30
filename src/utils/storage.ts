import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Contact, Settings, CheckInRecord } from '../types';
import { t } from '../i18n';

const DEVICE_ID_KEY = 'device_id';
const CONTACTS_KEY = 'contacts';
const SETTINGS_KEY = 'settings';
const CHECKIN_KEY = 'last_checkin';
const HISTORY_KEY = 'checkin_history';
const LANGUAGE_KEY = 'app_language';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function getContacts(): Promise<Contact[]> {
  const raw = await SecureStore.getItemAsync(CONTACTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(contacts));
}

export async function addContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
  const contacts = await getContacts();
  const newContact: Contact = { ...contact, id: generateId() };
  await saveContacts([...contacts, newContact]);
  return newContact;
}

export async function updateContact(contact: Contact): Promise<void> {
  const contacts = await getContacts();
  const updated = contacts.map((c) => (c.id === contact.id ? contact : c));
  await saveContacts(updated);
}

export async function deleteContact(id: string): Promise<void> {
  const contacts = await getContacts();
  await saveContacts(contacts.filter((c) => c.id !== id));
}

function getDefaultSettings(): Settings {
  return {
    triggerHours: 24,
    reminderHour: 9,
    reminderMinute: 0,
    personalMessage: '',
    personalMessageIsCustom: false,
    shareLocation: false,
    isPaused: false,
    pauseUntil: undefined,
  };
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  const settings = raw ? { ...getDefaultSettings(), ...JSON.parse(raw) } : getDefaultSettings();
  if (!settings.personalMessageIsCustom) {
    settings.personalMessage = t('defaultPersonalMessage');
  }
  return settings;
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...partial }));
}

export async function getLastCheckIn(): Promise<CheckInRecord | null> {
  const raw = await AsyncStorage.getItem(CHECKIN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveCheckIn(record: CheckInRecord): Promise<void> {
  await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(record));
  await addCheckInToHistory(record);
}

export function isCheckedInToday(record: CheckInRecord | null): boolean {
  if (!record) return false;
  const today = new Date().toDateString();
  const checkinDate = new Date(record.timestamp).toDateString();
  return today === checkinDate;
}

// Check-in history — keeps last 90 entries
export async function getCheckInHistory(): Promise<CheckInRecord[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addCheckInToHistory(record: CheckInRecord): Promise<void> {
  const history = await getCheckInHistory();
  const updated = [record, ...history].slice(0, 90);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function getLanguage(): Promise<string | null> {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}

export async function saveLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([SETTINGS_KEY, CHECKIN_KEY, HISTORY_KEY]);
  await SecureStore.deleteItemAsync(CONTACTS_KEY);
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
}
