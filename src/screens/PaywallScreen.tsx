import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing, fontSizes, radius } from '../theme';
import { useColors } from '../ThemeContext';
import {
  purchaseByPlan,
  restorePurchasesRC,
  isPurchasesConfigured,
  getPremiumPackages,
  PlanType,
} from '../utils/purchases';
import { PremiumContext } from '../PremiumContext';
import { t } from '../i18n';
import { apiSyncSettings } from '../utils/api';
import { getDeviceId, getSettings } from '../utils/storage';

const FALLBACK_PRICES: Record<PlanType, string> = {
  monthly: '€2.99',
  yearly:  '€29.99',
  lifetime: '€39.99',
};

// Apple Standard End User License Agreement (Terms of Use) — required for
// auto-renewable subscriptions (Guideline 3.1.2(c)).
const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function CheckIcon({ checked, colors }: { checked: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={checked
      ? { color: colors.primary, fontWeight: '700', fontSize: fontSizes.md }
      : { color: colors.textMuted, fontSize: fontSizes.md }}>
      {checked ? '✓' : '✗'}
    </Text>
  );
}

export default function PaywallScreen() {
  const colors = useColors();
  const navigation = useNavigation();
  const { refreshPremium } = useContext(PremiumContext);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [prices, setPrices] = useState<Record<PlanType, string>>(FALLBACK_PRICES);

  useEffect(() => {
    getPremiumPackages().then((pkgs) => {
      setPrices({
        monthly:  pkgs.monthly?.product?.priceString  ?? FALLBACK_PRICES.monthly,
        yearly:   pkgs.yearly?.product?.priceString   ?? FALLBACK_PRICES.yearly,
        lifetime: pkgs.lifetime?.product?.priceString ?? FALLBACK_PRICES.lifetime,
      });
    });
  }, []);

  const handlePurchase = async () => {
    if (!isPurchasesConfigured()) {
      Alert.alert(t('paywallError'), t('paywallComingSoon'));
      return;
    }
    setLoading(true);
    try {
      const success = await purchaseByPlan(selectedPlan);
      if (success) {
        await refreshPremium();
        // Immediately sync premium status to server
        const [deviceId, settings] = await Promise.all([getDeviceId(), getSettings()]);
        apiSyncSettings(deviceId, settings, undefined, true).catch(() => {});
        Alert.alert(t('paywallSuccess'), t('paywallSuccessMsg'), [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      if (err?.userCancelled) return;
      Alert.alert(t('paywallError'), t('paywallErrorMsg'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!isPurchasesConfigured()) {
      Alert.alert(t('paywallError'), t('paywallComingSoon'));
      return;
    }
    setLoading(true);
    try {
      const restored = await restorePurchasesRC();
      await refreshPremium();
      if (restored) {
        const [deviceId, settings] = await Promise.all([getDeviceId(), getSettings()]);
        apiSyncSettings(deviceId, settings, undefined, true).catch(() => {});
      }
      Alert.alert(
        restored ? t('paywallRestoreSuccess') : t('paywallRestoreNone'),
        '',
        [{ text: 'OK', onPress: restored ? () => navigation.goBack() : undefined }]
      );
    } catch {
      Alert.alert(t('paywallError'), t('paywallErrorMsg'));
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = selectedPlan === 'lifetime'
    ? t('paywallBuyLifetimeBtn', { price: prices.lifetime })
    : t('paywallSubscribeBtn', { price: selectedPlan === 'monthly'
        ? `${prices.monthly}${t('paywallPerMonth')}`
        : `${prices.yearly}${t('paywallPerYear')}` });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={[styles.headline, { color: colors.textPrimary }]}>{t('paywallHeadline')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('paywallSubtitle')}</Text>

        {/* Feature comparison table */}
        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.tableHeader, { backgroundColor: colors.border }]}>
            <View style={styles.featureCol} />
            <View style={styles.tierCol}>
              <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>{t('paywallColFree')}</Text>
            </View>
            <View style={styles.tierCol}>
              <Text style={[styles.tierLabel, { color: colors.primaryDark }]}>{t('paywallColPremium')} ⭐</Text>
            </View>
            <View style={styles.tierCol}>
              <Text style={[styles.tierLabel, { color: colors.primaryDark }]}>{t('paywallColLifetime')} 👑</Text>
            </View>
          </View>

          {[
            { label: t('paywallRowContacts'), free: t('paywallFreeContacts'), paid: t('paywallPremiumContacts'), isText: true },
            { label: t('paywallRowEmail'), freeCheck: true, paidCheck: true },
            { label: t('paywallRowSms'), freeCheck: false, paidCheck: true },
            { label: t('paywallRowEscalation'), freeCheck: false, paidCheck: true },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.tableRow, { borderBottomColor: colors.border },
                i === arr.length - 1 && styles.tableRowLast]}
            >
              <View style={styles.featureCol}>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>{row.label}</Text>
              </View>
              <View style={styles.tierCol}>
                {row.isText
                  ? <Text style={[styles.cellText, { color: colors.textSecondary }]}>{row.free}</Text>
                  : <CheckIcon checked={row.freeCheck!} colors={colors} />}
              </View>
              <View style={styles.tierCol}>
                {row.isText
                  ? <Text style={[styles.cellText, { color: colors.primaryDark, fontWeight: '700' }]}>{row.paid}</Text>
                  : <CheckIcon checked={row.paidCheck!} colors={colors} />}
              </View>
              <View style={styles.tierCol}>
                {row.isText
                  ? <Text style={[styles.cellText, { color: colors.primaryDark, fontWeight: '700' }]}>{row.paid}</Text>
                  : <CheckIcon checked={row.paidCheck!} colors={colors} />}
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <Text style={[styles.planSectionLabel, { color: colors.textSecondary }]}>{t('paywallChoosePlan')}</Text>
        <View style={styles.planRow}>
          {(['monthly', 'yearly', 'lifetime'] as PlanType[]).map((plan) => {
            const isSelected = selectedPlan === plan;
            const isYearly = plan === 'yearly';
            return (
              <TouchableOpacity
                key={plan}
                style={[
                  styles.planCard,
                  { borderColor: isSelected ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface },
                ]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.8}
              >
                {isYearly && (
                  <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.bestValueText}>{t('paywallBestValue')}</Text>
                  </View>
                )}
                <Text style={[styles.planName, { color: isSelected ? colors.primaryDark : colors.textPrimary }]}>
                  {plan === 'monthly'  ? t('paywallPlanMonthly')
                   : plan === 'yearly' ? t('paywallPlanYearly')
                                       : t('paywallPlanLifetime')}
                </Text>
                <Text style={[styles.planPrice, { color: isSelected ? colors.primaryDark : colors.textSecondary }]}>
                  {plan === 'monthly'  ? `${prices.monthly}${t('paywallPerMonth')}`
                   : plan === 'yearly' ? `${prices.yearly}${t('paywallPerYear')}`
                                       : prices.lifetime}
                </Text>
                {plan === 'lifetime' && (
                  <Text style={[styles.planSub, { color: isSelected ? colors.primaryDark : colors.textMuted }]}>
                    {t('paywallOneTimePurchase')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buyBtnText}>{ctaLabel}</Text>
          }
        </TouchableOpacity>

        {selectedPlan !== 'lifetime' && (
          <Text style={[styles.cancelAnytime, { color: colors.textMuted }]}>{t('paywallCancelAnytime')}</Text>
        )}

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>{t('paywallRestoreBtn')}</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textMuted }]}>{t('paywallLegal')}</Text>

        {/* Required legal links for auto-renewable subscriptions (Guideline 3.1.2(c)) */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
            <Text style={[styles.linkItem, { color: colors.textSecondary }]}>{t('privacyPolicyBtn')}</Text>
          </TouchableOpacity>
          <Text style={[styles.linkSep, { color: colors.textMuted }]}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(APPLE_EULA_URL)}>
            <Text style={[styles.linkItem, { color: colors.textSecondary }]}>{t('paywallTermsBtn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, alignItems: 'center' },
  headline: { fontSize: fontSizes.xl, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs },
  subtitle: { fontSize: fontSizes.md, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 22 },

  table: { width: '100%', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.xl },
  tableHeader: { flexDirection: 'row', paddingVertical: spacing.sm + 2, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1 },
  tableRowLast: { borderBottomWidth: 0 },
  featureCol: { flex: 2, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  tierCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tierLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  featureText: { fontSize: fontSizes.xs, fontWeight: '500' },
  cellText: { fontSize: fontSizes.xs, textAlign: 'center' },

  planSectionLabel: { fontSize: fontSizes.sm, fontWeight: '600', marginBottom: spacing.sm, alignSelf: 'flex-start' },
  planRow: { flexDirection: 'row', width: '100%', gap: spacing.sm, marginBottom: spacing.lg },
  planCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 2,
    alignItems: 'center',
  },
  bestValueText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  planName: { fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  planPrice: { fontSize: fontSizes.sm, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  planSub: { fontSize: 9, textAlign: 'center', marginTop: 1 },

  buyBtn: { width: '100%', borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', marginBottom: spacing.sm },
  buyBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  cancelAnytime: { fontSize: fontSizes.xs, textAlign: 'center', marginBottom: spacing.md },
  restoreBtn: { paddingVertical: spacing.sm, marginBottom: spacing.lg },
  restoreBtnText: { fontSize: fontSizes.sm, textDecorationLine: 'underline' },
  legal: { fontSize: fontSizes.xs, textAlign: 'center', lineHeight: 16, paddingHorizontal: spacing.md },
  linksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  linkItem: { fontSize: fontSizes.xs, textDecorationLine: 'underline' },
  linkSep: { fontSize: fontSizes.xs },
});
