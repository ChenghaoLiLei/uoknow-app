import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { CheckInRecord } from '../types';
import { getCheckInHistory, getDeviceId } from '../utils/storage';
import { apiFetchNotifications, NotificationRecord } from '../utils/api';
import { spacing, fontSizes, radius } from '../theme';
import { useColors } from '../ThemeContext';
import i18n, { t } from '../i18n';

function calcStreak(history: CheckInRecord[]): number {
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
  let streak = 0;
  let prev = new Date();
  prev.setHours(23, 59, 59, 999);

  for (const record of sorted) {
    const d = new Date(record.timestamp);
    const daysDiff = Math.floor((prev.getTime() - d.getTime()) / 86400000);
    if (daysDiff <= 1) {
      streak++;
      prev = d;
      prev.setHours(0, 0, 0, 0);
    } else {
      break;
    }
  }
  return streak;
}

function dayLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return t('historyToday');
  if (d.toDateString() === yesterday.toDateString()) return t('historyYesterday');
  return d.toLocaleDateString(i18n.locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(records: CheckInRecord[]): Array<{ date: string; timestamp: number; records: CheckInRecord[] }> {
  const map = new Map<string, CheckInRecord[]>();
  for (const r of records) {
    const key = new Date(r.timestamp).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([date, recs]) => ({
    date,
    timestamp: recs[0].timestamp,
    records: recs,
  }));
}

function levelLabel(level: number): string {
  if (level === 1) return t('notifLevel1');
  if (level === 2) return t('notifLevel2');
  return t('notifLevel3');
}

export default function HistoryScreen() {
  const colors = useColors();
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCheckInHistory().then(setHistory);
      getDeviceId().then(id => apiFetchNotifications(id).then(setNotifications)).catch(() => {});
    }, [])
  );

  const streak = calcStreak(history);
  const groups = groupByDay(history);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Summary bar */}
        <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>{streak}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('historyStreakLabel')}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primaryDark }]}>{history.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('historyTotalLabel')}</Text>
          </View>
        </View>

        {/* Check-in history */}
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('historyEmpty')}</Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>{t('historyEmptyHint')}</Text>
          </View>
        ) : (
          <>
            {groups.map((group) => (
              <View key={group.date} style={styles.dayGroup}>
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                  {dayLabel(group.timestamp)}
                </Text>
                {group.records.map((record) => (
                  <View
                    key={record.timestamp}
                    style={[styles.record, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.recordDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.recordTime, { color: colors.textPrimary }]}>
                      {timeLabel(record.timestamp)}
                    </Text>
                    {record.location && (
                      <Text style={[styles.recordLocation, { color: colors.textMuted }]}>
                        📍 {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                      </Text>
                    )}
                    <Text style={[styles.recordOk, { color: colors.primary }]}>✓</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text style={[styles.footer, { color: colors.textMuted }]}>
              {t('historyShowingLast', { n: history.length })}
            </Text>
          </>
        )}

        {/* Alert history */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('alertHistoryTitle')}</Text>
        </View>

        {notifications.length === 0 ? (
          <View style={[styles.alertEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.alertEmptyText, { color: colors.textMuted }]}>{t('alertHistoryEmpty')}</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <View
              key={n.id}
              style={[styles.alertRecord, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.alertLevel, { color: colors.danger }]}>🚨 {levelLabel(n.level)}</Text>
              <Text style={[styles.alertContact, { color: colors.textPrimary }]}>{n.contact_name}</Text>
              <Text style={[styles.alertTime, { color: colors.textMuted }]}>{dayLabel(n.sent_at)} {timeLabel(n.sent_at)}</Text>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  summaryRow: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  summaryValue: { fontSize: fontSizes.xxl, fontWeight: '800' },
  summaryLabel: { fontSize: fontSizes.xs, marginTop: 4 },
  summaryDivider: { width: 1 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: '600' },
  emptyHint: { fontSize: fontSizes.sm, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  dayGroup: { gap: spacing.sm },
  dayLabel: { fontSize: fontSizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  record: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, gap: spacing.sm },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordTime: { fontSize: fontSizes.md, fontWeight: '600', flex: 1 },
  recordLocation: { fontSize: fontSizes.xs, flex: 2 },
  recordOk: { fontSize: fontSizes.md, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: fontSizes.xs, marginTop: spacing.sm },
  sectionHeader: { marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  alertRecord: { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, gap: 4 },
  alertLevel: { fontSize: fontSizes.sm, fontWeight: '700' },
  alertContact: { fontSize: fontSizes.md, fontWeight: '600' },
  alertTime: { fontSize: fontSizes.xs },
  alertEmpty: { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, alignItems: 'center' },
  alertEmptyText: { fontSize: fontSizes.sm },
});
