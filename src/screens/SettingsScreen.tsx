import React, { useCallback, useContext, useState } from 'react';
import { PremiumContext } from '../PremiumContext';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import { Settings } from '../types';
import { spacing, fontSizes, radius } from '../theme';
import { useColors } from '../ThemeContext';
import { clearAllData, getDeviceId, getSettings, saveSettings } from '../utils/storage';
import { requestLocationPermission } from '../utils/location';
import { scheduleDailyReminder } from '../utils/notifications';
import { apiSyncSettings, apiDeleteDevice, isChinaRegion } from '../utils/api';
import i18n, { t } from '../i18n';
import { LanguageContext } from '../LanguageContext';
import appJson from '../../app.json';

const LANGUAGE_OPTIONS = [
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

// Pause duration presets in milliseconds
const PAUSE_OPTIONS = [
  { key: '1d', label: () => t('vacationDuration1d'), ms: 24 * 3600_000 },
  { key: '3d', label: () => t('vacationDuration3d'), ms: 3 * 24 * 3600_000 },
  { key: '1w', label: () => t('vacationDuration1w'), ms: 7 * 24 * 3600_000 },
  { key: '2w', label: () => t('vacationDuration2w'), ms: 14 * 24 * 3600_000 },
  { key: 'indefinite', label: () => t('vacationDurationIndefinite'), ms: 0 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function triggerLabel(h: number): string {
  if (h < 1) return t('timeMinutes', { n: Math.round(h * 60) });
  if (h < 24) return t('triggerHour', { n: h });
  return t('triggerDay', { n: h / 24 });
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function SettingsScreen() {
  const { language, changeLanguage } = useContext(LanguageContext);
  const { isPremium } = useContext(PremiumContext);
  const colors = useColors();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);
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
    // Best-effort: the local save above must survive a sync failure; the
    // self-heal push on the next Home focus converges the server.
    try {
      const deviceId = await getDeviceId();
      await apiSyncSettings(deviceId, updated, language, isPremium);
    } catch {}
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

  const handleVacationToggle = async (value: boolean) => {
    if (!value) {
      await save({ isPaused: false, pauseUntil: undefined });
      return;
    }
    // Show duration picker when enabling
    Alert.alert(
      t('vacationDuration'),
      '',
      PAUSE_OPTIONS.map((opt) => ({
        text: opt.label(),
        onPress: async () => {
          const pauseUntil = opt.ms > 0 ? Date.now() + opt.ms : undefined;
          await save({ isPaused: true, pauseUntil });
        },
      }))
    );
  };

  const handleReset = () => {
    Alert.alert(t('resetTitle'), t('resetMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('resetConfirm'),
        style: 'destructive',
        onPress: async () => {
          const deviceId = await getDeviceId();
          await apiDeleteDevice(deviceId);
          await clearAllData();
          await loadSettings();
          Alert.alert(t('resetDoneTitle'), t('resetDoneMsg'));
        },
      },
    ]);
  };

  const openTimePicker = () => {
    setTempHour(settings.reminderHour);
    setTempMinute(settings.reminderMinute);
    setTimePickerVisible(true);
  };

  const confirmTimePicker = async () => {
    setTimePickerVisible(false);
    await handleReminderChange(tempHour, tempMinute);
  };

  const vacationStatus = () => {
    if (!settings.isPaused) return null;
    if (settings.pauseUntil) {
      const date = new Date(settings.pauseUntil).toLocaleDateString(i18n.locale);
      return t('vacationResumesAt', { date });
    }
    return t('vacationIndefinite');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Trigger window */}
        <SectionHeader title={t('triggerSectionTitle')} hint={t('triggerSectionHint')} colors={colors} />
        <View style={styles.chipRow}>
          {TRIGGER_OPTIONS.map((h) => (
            <TouchableOpacity
              key={h}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface },
                settings.triggerHours === h && { borderColor: colors.primary, backgroundColor: colors.primary }]}
              onPress={() => save({ triggerHours: h })}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary },
                settings.triggerHours === h && { color: '#fff' }]}>
                {triggerLabel(h)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminder time — custom picker */}
        <SectionHeader title={t('reminderSectionTitle')} hint={t('reminderSectionHint')} colors={colors} />
        <TouchableOpacity
          style={[styles.timeButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          onPress={openTimePicker}
        >
          <Text style={[styles.timeButtonText, { color: colors.primaryDark }]}>
            🕐 {pad(settings.reminderHour)}:{pad(settings.reminderMinute)}
          </Text>
          <Text style={[styles.timeButtonHint, { color: colors.textMuted }]}>{t('tapToChange')}</Text>
        </TouchableOpacity>

        {/* Personal message */}
        <SectionHeader title={t('messageSectionTitle')} hint={t('messageSectionHint')} colors={colors} />
        <TextInput
          style={[styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          value={settings.personalMessage}
          onChangeText={(v) => save({ personalMessage: v, personalMessageIsCustom: true })}
          multiline
          numberOfLines={4}
          placeholder={t('messagePlaceholder')}
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
        />

        {/* Location */}
        <SectionHeader title={t('locationSectionTitle')} hint={t('locationSectionHint')} colors={colors} />
        <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>{t('locationToggleLabel')}</Text>
            <Text style={[styles.toggleHint, { color: colors.textMuted }]}>{t('locationToggleHint')}</Text>
          </View>
          <Switch
            value={settings.shareLocation}
            onValueChange={handleLocationToggle}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.shareLocation ? colors.primary : '#fff'}
          />
        </View>

        {/* Vacation mode */}
        <SectionHeader title={t('vacationSectionTitle')} hint={t('vacationSectionHint')} colors={colors} />
        <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>{t('vacationToggleLabel')}</Text>
            <Text style={[styles.toggleHint, { color: settings.isPaused ? colors.warning : colors.textMuted }]}>
              {vacationStatus() ?? t('vacationToggleHint')}
            </Text>
          </View>
          <Switch
            value={settings.isPaused}
            onValueChange={handleVacationToggle}
            trackColor={{ false: colors.border, true: '#FFB74D' }}
            thumbColor={settings.isPaused ? colors.warning : '#fff'}
          />
        </View>

        {/* Language */}
        <SectionHeader title={t('languageSectionTitle')} colors={colors} />
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface },
                language === lang.code && { borderColor: colors.primary, backgroundColor: colors.primary }]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary },
                language === lang.code && { color: '#fff' }]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan */}
        <SectionHeader title={t('planSectionTitle')} colors={colors} />
        <View style={[styles.planRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.planText, { color: colors.textSecondary }]}>
            {isPremium ? t('planPremium') : t('planFree')}
          </Text>
          {!isPremium && (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Text style={styles.upgradeBtnText}>{t('upgradeBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* About */}
        <SectionHeader title={t('aboutSectionTitle')} colors={colors} />
        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Text style={[styles.linkText, { color: colors.textPrimary }]}>{t('privacyPolicyBtn')}</Text>
          <Text style={[styles.linkArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.sm }]}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={[styles.linkText, { color: colors.textPrimary }]}>📅 {t('historyScreenTitle')}</Text>
          <Text style={[styles.linkArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
        <Text style={[styles.versionText, { color: colors.textMuted }]}>{t('appVersion', { version: appJson.expo.version })}</Text>
        {isChinaRegion() && (
          <TouchableOpacity onPress={() => Linking.openURL('https://beian.miit.gov.cn/')}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>鄂ICP备2026030287号-2A</Text>
          </TouchableOpacity>
        )}

        {/* Danger zone */}
        <SectionHeader title={t('dangerZone')} colors={colors} />
        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}
          onPress={handleReset}
        >
          <Text style={[styles.dangerButtonText, { color: colors.danger }]}>{t('resetBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom time picker modal */}
      <Modal visible={timePickerVisible} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                <Text style={[styles.pickerCancel, { color: colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>{t('reminderSectionTitle')}</Text>
              <TouchableOpacity onPress={confirmTimePicker}>
                <Text style={[styles.pickerDone, { color: colors.primary }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerColumns}>
              {/* Hour column */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>HH</Text>
                <FlatList
                  data={HOURS}
                  keyExtractor={(item) => String(item)}
                  style={styles.pickerList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === tempHour && { backgroundColor: colors.primaryLight }]}
                      onPress={() => setTempHour(item)}
                    >
                      <Text style={[styles.pickerItemText, { color: item === tempHour ? colors.primaryDark : colors.textPrimary },
                        item === tempHour && { fontWeight: '700' }]}>
                        {pad(item)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <Text style={[styles.pickerColon, { color: colors.textPrimary }]}>:</Text>

              {/* Minute column */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textMuted }]}>MM</Text>
                <FlatList
                  data={MINUTES}
                  keyExtractor={(item) => String(item)}
                  style={styles.pickerList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.pickerItem, item === tempMinute && { backgroundColor: colors.primaryLight }]}
                      onPress={() => setTempMinute(item)}
                    >
                      <Text style={[styles.pickerItemText, { color: item === tempMinute ? colors.primaryDark : colors.textPrimary },
                        item === tempMinute && { fontWeight: '700' }]}>
                        {pad(item)}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>

            <View style={styles.pickerPreview}>
              <Text style={[styles.pickerPreviewText, { color: colors.primaryDark }]}>
                {t('reminderPreview', { time: `${pad(tempHour)}:${pad(tempMinute)}` })}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, hint, colors }: { title: string; hint?: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {hint && <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '700' },
  sectionHint: { fontSize: fontSizes.xs, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  chipText: { fontSize: fontSizes.sm, fontWeight: '600' },
  timeButton: { borderRadius: radius.md, borderWidth: 1.5, padding: spacing.md, alignItems: 'center' },
  timeButtonText: { fontSize: fontSizes.xl, fontWeight: '700' },
  timeButtonHint: { fontSize: fontSizes.xs, marginTop: 4 },
  textarea: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: fontSizes.md, minHeight: 100, lineHeight: 22 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: fontSizes.md, fontWeight: '600' },
  toggleHint: { fontSize: fontSizes.xs, marginTop: 2 },
  dangerButton: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, marginTop: spacing.sm },
  dangerButtonText: { fontSize: fontSizes.md, fontWeight: '700' },
  linkRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1 },
  linkText: { flex: 1, fontSize: fontSizes.md, fontWeight: '500' },
  linkArrow: { fontSize: 20 },
  versionText: { fontSize: fontSizes.xs, textAlign: 'center', marginTop: spacing.sm },
  planRow: { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, gap: spacing.sm },
  planText: { fontSize: fontSizes.sm },
  upgradeBtn: { borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  upgradeBtnText: { fontSize: fontSizes.sm, fontWeight: '700', color: '#fff' },
  // Time picker modal
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: spacing.xxl },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1 },
  pickerTitle: { fontSize: fontSizes.md, fontWeight: '600' },
  pickerCancel: { fontSize: fontSizes.md },
  pickerDone: { fontSize: fontSizes.md, fontWeight: '700' },
  pickerColumns: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  pickerCol: { flex: 1 },
  pickerColLabel: { textAlign: 'center', fontSize: fontSizes.xs, marginBottom: spacing.xs },
  pickerList: { height: 200 },
  pickerItem: { paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  pickerItemText: { fontSize: fontSizes.lg },
  pickerColon: { fontSize: 32, fontWeight: '700', paddingHorizontal: spacing.sm, marginTop: spacing.lg },
  pickerPreview: { alignItems: 'center', paddingVertical: spacing.md },
  pickerPreviewText: { fontSize: fontSizes.md, fontWeight: '700' },
});
