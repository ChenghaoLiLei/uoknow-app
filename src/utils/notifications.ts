import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../i18n';
import { getContacts, getLastCheckIn, getSettings, isCheckedInToday } from './storage';

// Up to 1.0.7 the daily reminder was one repeating notification under this id.
// It is still cancelled on every sync so upgraded installs don't get doubles.
const LEGACY_REMINDER_ID = 'daily-checkin-reminder';

// The daily reminder is now planned as one dated notification per day, so
// today's can be left out once the user has checked in (which is what lets it
// be time-sensitive without nagging). Re-planned on every app open.
const DAILY_DAYS = 14;
const dailyId = (i: number) => `daily-${i}`;

// Category that puts an "I'm OK" button on check-in notifications. The action
// brings the app to the foreground and HomeScreen performs the check-in.
export const CHECKIN_CATEGORY = 'checkin';
export const CHECKIN_ACTION = 'CHECKIN_OK';

// Warnings shown to the user shortly before the server alerts their contacts.
const PRE_ALERTS = [
  { id: 'prealert-120', leadMs: 2 * 60 * 60 * 1000, bodyKey: 'preAlertBody2h' },
  { id: 'prealert-30', leadMs: 30 * 60 * 1000, bodyKey: 'preAlertBody30m' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: t('appSubtitle'),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function registerCheckInCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CHECKIN_CATEGORY, [
    {
      identifier: CHECKIN_ACTION,
      buttonTitle: t('notifActionOk'),
      options: { opensAppToForeground: true },
    },
  ]);
}

async function cancelAll(): Promise<void> {
  const ids = [
    LEGACY_REMINDER_ID,
    ...PRE_ALERTS.map((a) => a.id),
    ...Array.from({ length: DAILY_DAYS }, (_, i) => dailyId(i)),
  ];
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}

async function scheduleAt(id: string, fireAt: number, title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        sound: true,
        categoryIdentifier: CHECKIN_CATEGORY,
        // Breaks through Focus / Do Not Disturb (needs the time-sensitive entitlement).
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(fireAt),
      },
    });
  } catch {}
}

// Re-plan every local notification from the stored state: the daily check-in
// reminder and the "contacts will be alerted soon" warnings. Call after
// anything that can move them: app open, a check-in, a settings change
// (reminder time, trigger hours, vacation mode), a contact or language change.
// Never throws — a notification hiccup must not break check-in or settings.
export async function syncReminders(): Promise<void> {
  try {
    const [record, settings] = await Promise.all([getLastCheckIn(), getSettings()]);

    // Unknown contact count (keychain read failed) is treated as "has contacts".
    let hasContacts = true;
    try { hasContacts = (await getContacts()).length > 0; } catch {}

    await cancelAll();
    try { await registerCheckInCategory(); } catch {}

    // Vacation mode without an end date: no reminders, no alerts.
    if (settings.isPaused && !settings.pauseUntil) return;
    const pausedUntil = settings.isPaused && settings.pauseUntil ? settings.pauseUntil : 0;

    const now = Date.now();

    // Daily reminder: skip today's once checked in, and skip days inside a pause.
    const checkedToday = isCheckedInToday(record);
    for (let i = 0; i < DAILY_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(settings.reminderHour, settings.reminderMinute, 0, 0);
      const fireAt = d.getTime();
      if (fireAt <= now + 2000) continue;
      if (i === 0 && checkedToday) continue;
      if (fireAt < pausedUntil) continue;
      await scheduleAt(dailyId(i), fireAt, t('reminderNotifTitle'), t('reminderNotifBody'));
    }

    // Pre-alerts. No check-in yet → the server has nothing to time out;
    // no contacts → it alerts nobody.
    if (!record || !hasContacts) return;

    // The server alerts once trigger hours have elapsed, but not before a
    // vacation pause has ended (it auto-resumes at pauseUntil).
    const alertAt = Math.max(record.timestamp + settings.triggerHours * 60 * 60 * 1000, pausedUntil);
    for (const a of PRE_ALERTS) {
      const fireAt = alertAt - a.leadMs;
      if (fireAt <= now + 2000) continue;
      await scheduleAt(a.id, fireAt, t('preAlertTitle'), t(a.bodyKey));
    }
  } catch {}
}

export async function sendLocalCheckInConfirmation(): Promise<void> {
  // Clear reminders / warnings still sitting in Notification Centre — they are
  // answered now.
  try { await Notifications.dismissAllNotificationsAsync(); } catch {}
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('checkInSuccessTitle'),
      body: t('checkInSuccessBody'),
    },
    trigger: null,
  });
}
