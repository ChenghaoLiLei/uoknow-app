import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  purchasePremium,
  restorePurchasesRC,
  isPurchasesConfigured,
  getLifetimePackage,
} from '../utils/purchases';
import { PremiumContext } from '../PremiumContext';
import { t } from '../i18n';

// Fallback prices shown before RevenueCat loads (or when not configured)
const FALLBACK_PRICE: Record<string, string> = {
  zh:    '¥17.99',
  'zh-TW': 'NT$89',
  ja:    '¥480',
  ko:    '₩3,900',
};
const DEFAULT_FALLBACK = '$2.99';

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
  const [localizedPrice, setLocalizedPrice] = useState<string | null>(null);

  // Fetch the real localized price from RevenueCat on mount
  useEffect(() => {
    getLifetimePackage().then((pkg) => {
      if (pkg?.product?.localizedPriceString) {
        setLocalizedPrice(pkg.product.localizedPriceString);
      }
    });
  }, []);

  const displayPrice = localizedPrice ?? DEFAULT_FALLBACK;

  const handleBuy = async () => {
    if (!isPurchasesConfigured()) {
      Alert.alert(t('paywallError'), t('paywallComingSoon'));
      return;
    }
    setLoading(true);
    try {
      const success = await purchasePremium();
      if (success) {
        await refreshPremium();
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
          </View>

          {[
            { label: t('paywallRowContacts'), free: t('paywallFreeContacts'), premium: t('paywallPremiumContacts'), isText: true },
            { label: t('paywallRowEmail'), freeCheck: true, premiumCheck: true },
            { label: t('paywallRowSms'), freeCheck: false, premiumCheck: true },
            { label: t('paywallRowEscalation'), freeCheck: false, premiumCheck: true },
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
                  ? <Text style={[styles.cellText, { color: colors.primaryDark, fontWeight: '700' }]}>{row.premium}</Text>
                  : <CheckIcon checked={row.premiumCheck!} colors={colors} />}
              </View>
            </View>
          ))}
        </View>

        {/* Price badge */}
        <View style={[styles.priceBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.priceAmount, { color: colors.primaryDark }]}>{displayPrice}</Text>
          <Text style={[styles.priceLabel, { color: colors.primaryDark }]}>{t('paywallOneTime')}</Text>
        </View>

        {/* Buy button */}
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]}
          onPress={handleBuy}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buyBtnText}>{t('paywallBuyBtn', { price: displayPrice })}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>{t('paywallRestoreBtn')}</Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textMuted }]}>{t('paywallLegal')}</Text>
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
  featureCol: { flex: 2, paddingHorizontal: spacing.md, justifyContent: 'center' },
  tierCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tierLabel: { fontSize: fontSizes.sm, fontWeight: '700', textAlign: 'center' },
  featureText: { fontSize: fontSizes.sm, fontWeight: '500' },
  cellText: { fontSize: fontSizes.sm, textAlign: 'center' },
  priceBadge: { borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  priceAmount: { fontSize: fontSizes.xxl, fontWeight: '900' },
  priceLabel: { fontSize: fontSizes.xs, fontWeight: '600', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  buyBtn: { width: '100%', borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', marginBottom: spacing.md },
  buyBtnText: { fontSize: fontSizes.md, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  restoreBtn: { paddingVertical: spacing.sm, marginBottom: spacing.lg },
  restoreBtnText: { fontSize: fontSizes.sm, textDecorationLine: 'underline' },
  legal: { fontSize: fontSizes.xs, textAlign: 'center', lineHeight: 16, paddingHorizontal: spacing.md },
});
