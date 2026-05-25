import React, { useCallback, useContext, useState } from 'react';
import { PremiumContext } from '../PremiumContext';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import { Settings } from '../types';
import { colors, fontSizes, radius, spacing } from '../theme';
import { clearAllData, getDeviceId, getSettings, saveSettings } from '../utils/storage';
import { requestLocationPermission } from '../utils/location';
import { scheduleDailyReminder } from '../utils/notifications';
import { apiSyncSettings } from '../utils/api';
import { t } from '../i18n';
import { LanguageContext } from '../LanguageContext';

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'da', label: 'Dansk' },
  { code: 'no', label: 'Norsk' },
  { code: 'fi', label: 'Suomi' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Bahasa Melayu' },
];

const TRIGGER_OPTIONS = [4, 8, 12, 24, 48, 72];

const REMINDER_OPTIONS = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '3:00 PM', hour: 15, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];

function triggerLabel(h: number): string {
  if (h < 1) return t('timeMinutes', { n: Math.round(h * 60) });
  if (h < 24) return t('triggerHour', { n: h });
  return t('triggerDay', { n: h / 24 });
}

export default function SettingsScreen() {
  const { language, changeLanguage } = useContext(LanguageContext);
  const { isPremium } = useContext(PremiumContext);
  const [settings, setSettings] = useState<Settings | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const loadSettings = useCallback(async () => {
    setSettings(await getSettings());
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  if (!settings) return null;

  const save = async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveSettings(partial);
    const deviceId = await getDeviceId();
    await apiSyncSettings(deviceId, updated, language, isPremium);
  };

  const handleReminderChange = async (hour: number, minute: number) => {
    await save({ reminderHour: hour, reminderMinute: minute });
    await scheduleDailyReminder(hour, minute);
  };

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(t('locationDeniedTitle'), t('locationDeniedMsg'));
        return;
      }
    }
    await save({ shareLocation: value });
  };

  const handleReset = () => {
    Alert.alert(
      t('resetTitle'),
      t('resetMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('resetConfirm'),
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadSettings();
            Alert.alert(t('resetDoneTitle'), t('resetDoneMsg'));
          },
        },
      ]
    );
  };

  const selectedReminderIdx = REMINDER_OPTIONS.findIndex(
    (o) => o.hour === settings.reminderHour && o.minute === settings.reminderMinute
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <SectionHeader title={t('triggerSectionTitle')} hint={t('triggerSectionHint')} />
        <View style={styles.chipRow}>
          {TRIGGER_OPTIONS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, settings.triggerHours === h && styles.chipSelected]}
              onPress={() => save({ triggerHours: h })}
            >
              <Text style={[styles.chipText, settings.triggerHours === h && styles.chipTextSelected]}>
                {triggerLabel(h)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title={t('reminderSectionTitle')} hint={t('reminderSectionHint')} />
        <View style={styles.chipRow}>
          {REMINDER_OPTIONS.map((o, idx) => (
            <TouchableOpacity
              key={o.label}
              style={[styles.chip, selectedReminderIdx === idx && styles.chipSelected]}
              onPress={() => handleReminderChange(o.hour, o.minute)}
            >
              <Text style={[styles.chipText, selectedReminderIdx === idx && styles.chipTextSelected]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title={t('messageSectionTitle')} hint={t('messageSectionHint')} />
        <TextInput
          style={styles.textarea}
          value={settings.personalMessage}
          onChangeText={(v) => save({ personalMessage: v, personalMessageIsCustom: true })}
          multiline
          numberOfLines={4}
          placeholder={t('messagePlaceholder')}
          textAlignVertical="top"
        />

        <SectionHeader title={t('locationSectionTitle')} hint={t('locationSectionHint')} />
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>{t('locationToggleLabel')}</Text>
            <Text style={styles.toggleHint}>{t('locationToggleHint')}</Text>
          </View>
          <Switch
            value={settings.shareLocation}
            onValueChange={handleLocationToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.shareLocation ? colors.primary : '#fff'}
          />
        </View>

        <SectionHeader title={t('languageSectionTitle')} />
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.chip, language === lang.code && styles.chipSelected]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[styles.chipText, language === lang.code && styles.chipTextSelected]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title={t('planSectionTitle')} />
        <View style={styles.planRow}>
          <Text style={styles.planText}>
            {isPremium ? t('planPremium') : t('planFree')}
          </Text>
          {!isPremium && (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upgradeBtnText}>{t('upgradeBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <SectionHeader title={t('aboutSectionTitle')} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={styles.linkText}>{t('privacyPolicyBtn')}</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>{t('appVersion', { version: '1.0.0' })}</Text>

        <SectionHeader title={t('dangerZone')} />
        <TouchableOpacity style={styles.dangerButton} onPress={handleReset}>
          <Text style={styles.dangerButtonText}>{t('resetBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint && <Text style={styles.sectionHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary },
  sectionHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    minHeight: 100,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: fontSizes.md, fontWeight: '600', color: colors.textPrimary },
  toggleHint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  dangerButton: {
    backgroundColor: '#FFEBEE',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: spacing.sm,
  },
  dangerButtonText: { fontSize: fontSizes.md, fontWeight: '700', color: colors.danger },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: { flex: 1, fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: '500' },
  linkArrow: { fontSize: 20, color: colors.textMuted },
  versionText: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  planRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  upgradeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  upgradeBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: '#fff' },
});
