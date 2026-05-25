import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, radius, spacing } from '../theme';
import { t } from '../i18n';

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <Text style={checked ? styles.checkYes : styles.checkNo}>
      {checked ? '✓' : '✗'}
    </Text>
  );
}

export default function PaywallScreen() {
  const handleSubscribe = () => {
    Alert.alert('Coming Soon', t('paywallComingSoon'));
  };

  const handleRestore = () => {
    Alert.alert('Coming Soon', t('paywallComingSoon'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>{t('paywallHeadline')}</Text>
        <Text style={styles.subtitle}>{t('paywallSubtitle')}</Text>

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <View style={styles.featureCol} />
            <View style={styles.tierCol}>
              <Text style={styles.tierLabelFree}>{t('paywallColFree')}</Text>
            </View>
            <View style={styles.tierCol}>
              <Text style={styles.tierLabelPremium}>{t('paywallColPremium')} ⭐</Text>
            </View>
          </View>

          {/* Row: Contacts */}
          <View style={styles.tableRow}>
            <View style={styles.featureCol}>
              <Text style={styles.featureText}>{t('paywallRowContacts')}</Text>
            </View>
            <View style={styles.tierCol}>
              <Text style={styles.cellText}>{t('paywallFreeContacts')}</Text>
            </View>
            <View style={styles.tierCol}>
              <Text style={[styles.cellText, styles.cellTextPremium]}>{t('paywallPremiumContacts')}</Text>
            </View>
          </View>

          {/* Row: Email */}
          <View style={styles.tableRow}>
            <View style={styles.featureCol}>
              <Text style={styles.featureText}>{t('paywallRowEmail')}</Text>
            </View>
            <View style={styles.tierCol}><CheckIcon checked /></View>
            <View style={styles.tierCol}><CheckIcon checked /></View>
          </View>

          {/* Row: SMS */}
          <View style={[styles.tableRow, styles.tableRowLast]}>
            <View style={styles.featureCol}>
              <Text style={styles.featureText}>{t('paywallRowSms')}</Text>
            </View>
            <View style={styles.tierCol}><CheckIcon checked={false} /></View>
            <View style={styles.tierCol}><CheckIcon checked /></View>
          </View>
        </View>

        <Text style={styles.price}>{t('paywallPrice')}</Text>

        <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
          <Text style={styles.subscribeBtnText}>{t('paywallSubscribeBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
          <Text style={styles.restoreBtnText}>{t('paywallRestoreBtn')}</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>{t('paywallLegal')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'center' },
  headline: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  table: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F0',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: { borderBottomWidth: 0 },
  featureCol: { flex: 2, paddingHorizontal: spacing.md, justifyContent: 'center' },
  tierCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tierLabelFree: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tierLabelPremium: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  featureText: { fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: '500' },
  cellText: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center' },
  cellTextPremium: { color: colors.primaryDark, fontWeight: '700' },
  checkYes: { fontSize: fontSizes.md, color: colors.primary, fontWeight: '700' },
  checkNo: { fontSize: fontSizes.md, color: colors.textMuted },
  price: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.md,
  },
  subscribeBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subscribeBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#fff',
  },
  restoreBtn: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  restoreBtnText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
});
