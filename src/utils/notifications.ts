import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../i18n';

const REMINDER_ID = 'daily-checkin-reminder';

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

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: t('reminderNotifTitle'),
      body: t('reminderNotifBody'),
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}

export async function sendLocalCheckInConfirmation(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('checkInSuccessTitle'),
      body: t('checkInSuccessBody'),
    },
    trigger: null,
  });
}
