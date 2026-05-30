import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSizes, spacing } from '../theme';
import { useColors } from '../ThemeContext';
import { t } from '../i18n';

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const sections = [
    { h: t('ppH1'), p: t('ppP1') },
    { h: t('ppH2'), p: t('ppP2') },
    { h: t('ppH3'), p: t('ppP3') },
    { h: t('ppH4'), p: t('ppP4') },
    { h: t('ppH5'), p: t('ppP5') },
    { h: t('ppH6'), p: t('ppP6') },
    { h: t('ppH7'), p: t('ppP7') },
    { h: t('ppH8'), p: t('ppP8') },
    { h: t('ppH9'), p: t('ppP9') },
  ];
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.updated, { color: colors.textMuted }]}>{t('ppUpdated')}</Text>
        {sections.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>{s.h}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  updated: { fontSize: fontSizes.xs, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  heading: { fontSize: fontSizes.md, fontWeight: '700', marginBottom: spacing.xs },
  body: { fontSize: fontSizes.sm, lineHeight: 22 },
});
