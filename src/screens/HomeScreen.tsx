import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../types';
import { colors, spacing, fontSizes, radius } from '../theme';
import {
  getLastCheckIn,
  saveCheckIn,
  isCheckedInToday,
  getContacts,
  getSettings,
  getDeviceId,
} from '../utils/storage';
import { requestPermissions, scheduleDailyReminder, sendLocalCheckInConfirmation } from '../utils/notifications';
import { getCurrentLocation, requestLocationPermission } from '../utils/location';
import { apiCheckIn } from '../utils/api';
import { t } from '../i18n';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const [checkedIn, setCheckedIn] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [nextAlertIn, setNextAlertIn] = useState<string>('');
  const [contactCount, setContactCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!checkedIn) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [checkedIn, glowAnim]);

  const loadState = useCallback(async () => {
    await requestPermissions();
    const [record, contacts, settings] = await Promise.all([
      getLastCheckIn(),
      getContacts(),
      getSettings(),
    ]);

    const alreadyChecked = isCheckedInToday(record);
    setCheckedIn(alreadyChecked);
    setContactCount(contacts.length);

    if (record) {
      setLastCheckInTime(new Date(record.timestamp));
      const elapsed = (Date.now() - record.timestamp) / (1000 * 60 * 60);
      const remaining = settings.triggerHours - elapsed;
      setNextAlertIn(remaining > 0 ? formatHours(remaining) : 'overdue');
    }

    if (!initialized) {
      await scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
      setInitialized(true);
    }
  }, [initialized]);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  const handleCheckIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.08, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    const settings = await getSettings();
    let location: { latitude: number; longitude: number } | undefined;

    if (settings.shareLocation) {
      const granted = await requestLocationPermission();
      if (granted) {
        const coords = await getCurrentLocation();
        if (coords) location = coords;
      }
    }

    const record = { timestamp: Date.now(), location };
    await saveCheckIn(record);

    const deviceId = await getDeviceId();
    await apiCheckIn(deviceId, location);

    setCheckedIn(true);
    setLastCheckInTime(new Date(record.timestamp));
    setNextAlertIn(formatHours(settings.triggerHours));

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sendLocalCheckInConfirmation();
  };

  const buttonScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const buttonColor = checkedIn ? colors.success : colors.primary;
  const catEmoji = checkedIn ? '😸' : '🐱';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>UOKnow</Text>
        <Text style={styles.appSubtitle}>{t('appSubtitle')}</Text>
      </View>

      <View style={styles.centerArea}>
        <Animated.View
          style={[
            styles.buttonWrapper,
            { transform: [{ scale: checkedIn ? scaleAnim : buttonScale }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCheckIn}
            style={[styles.checkInButton, { backgroundColor: buttonColor }]}
          >
            <Text style={styles.catEmoji}>{catEmoji}</Text>
            <Text style={styles.buttonLabel}>
              {checkedIn ? t('btnCheckedIn') : t('btnCheckIn')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.statusArea}>
          {lastCheckInTime ? (
            <>
              <Text style={styles.statusText}>
                {t('lastCheckIn', { time: formatTime(lastCheckInTime) })}
              </Text>
              {nextAlertIn ? (
                <Text
                  style={[
                    styles.alertText,
                    nextAlertIn === 'overdue' && styles.alertDanger,
                  ]}
                >
                  {nextAlertIn === 'overdue'
                    ? t('alertOverdue')
                    : t('alertTimeLeft', { time: nextAlertIn })}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusTextMuted}>{t('noCheckInYet')}</Text>
          )}
        </View>

        {contactCount === 0 && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={() => navigation.navigate('Contacts')}
          >
            <Text style={styles.warningText}>{t('noContactsWarning')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Contacts')}
        >
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>
            {t('navContacts')}{contactCount > 0 ? ` (${contactCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>{t('navSettings')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHours(hours: number): string {
  if (hours < 1) return t('timeMinutes', { n: Math.round(hours * 60) });
  if (hours < 24) return t('timeHours', { n: Math.round(hours) });
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0
    ? t('timeDaysHours', { days, hours: rem })
    : t('timeDays', { n: days });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  appTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 4,
  },
  appSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 2,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonWrapper: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  checkInButton: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 88, lineHeight: 100 },
  buttonLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  statusArea: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  statusText: { fontSize: fontSizes.md, color: colors.textSecondary },
  statusTextMuted: { fontSize: fontSizes.md, color: colors.textMuted, fontStyle: 'italic' },
  alertText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  alertDanger: { color: colors.danger, fontWeight: '600' },
  warningBanner: {
    marginTop: spacing.lg,
    backgroundColor: '#FFF3E0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  warningText: { fontSize: fontSizes.sm, color: colors.warning, fontWeight: '600' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  navIcon: { fontSize: 24 },
  navLabel: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.xs },
});
