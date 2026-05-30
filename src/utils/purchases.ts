/**
 * RevenueCat in-app purchase wrapper — one-time buy (Non-Consumable).
 *
 * Setup steps:
 *  1. cd app && npm install react-native-purchases
 *  2. cd app/ios && pod install  (then rebuild)
 *  3. Create a RevenueCat project at https://app.revenuecat.com
 *  4. Set EXPO_PUBLIC_RC_API_KEY=appl_xxxx in app/.env
 *  5. In App Store Connect: create a Non-Consumable IAP product
 *       Product ID: com.uoknow.app.premium_lifetime
 *       Pricing (set manually per storefront):
 *         US/Europe:  $2.99  (Tier 3)
 *         China:      ¥17.99 CNY
 *         Japan:      ¥480   JPY
 *         Korea:      ₩3,900 KRW
 *         All others: auto-calculated from $2.99 base
 *  6. In RevenueCat dashboard:
 *       - Products → Add → paste Product ID above
 *       - Entitlements → "premium" → attach the product
 *       - Offerings → Default → add a "Lifetime" package → pick the product
 */

import Purchases, { LOG_LEVEL, PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';

const RC_API_KEY = process.env.EXPO_PUBLIC_RC_API_KEY ?? '';

export function isPurchasesConfigured(): boolean {
  return RC_API_KEY.length > 0;
}

export async function initPurchases(): Promise<void> {
  if (!isPurchasesConfigured()) {
    console.log('[IAP] RevenueCat not configured — running in free-only mode');
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: RC_API_KEY });
}

export async function getIsPremium(): Promise<boolean> {
  if (!isPurchasesConfigured()) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active['premium'] !== undefined;
  } catch {
    return false;
  }
}

// Returns the one-time purchase package with its localized price info.
// RevenueCat automatically surfaces the correct price for the user's App Store region.
export async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  if (!isPurchasesConfigured()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.packageType === PACKAGE_TYPE.LIFETIME
    ) ?? offerings.current?.availablePackages[0] ?? null;
    return pkg;
  } catch {
    return null;
  }
}

export async function purchasePremium(): Promise<boolean> {
  if (!isPurchasesConfigured()) throw new Error('iap_not_configured');
  const pkg = await getLifetimePackage();
  if (!pkg) throw new Error('no_offering');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active['premium'] !== undefined;
}

export async function restorePurchasesRC(): Promise<boolean> {
  if (!isPurchasesConfigured()) return false;
  try {
    const info = await Purchases.restorePurchases();
    return info.entitlements.active['premium'] !== undefined;
  } catch {
    return false;
  }
}
