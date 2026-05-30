export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Settings {
  triggerHours: number;
  reminderHour: number;
  reminderMinute: number;
  personalMessage: string;
  personalMessageIsCustom: boolean;
  shareLocation: boolean;
  isPaused: boolean;
  pauseUntil?: number;
}

export interface CheckInRecord {
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type RootStackParamList = {
  Home: undefined;
  Contacts: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  Paywall: undefined;
  History: undefined;
};
