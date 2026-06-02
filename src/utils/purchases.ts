import Purchases, { LOG_LEVEL, PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';

export type PlanType = 'monthly' | 'yearly' | 'lifetime';

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

export interface PremiumPackages {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}

export async function getPremiumPackages(): Promise<PremiumPackages> {
  if (!isPurchasesConfigured()) return { monthly: null, yearly: null, lifetime: null };
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    return {
      monthly: pkgs.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY) ?? null,
      yearly: pkgs.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL) ?? null,
      lifetime: pkgs.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME) ?? null,
    };
  } catch {
    return { monthly: null, yearly: null, lifetime: null };
  }
}

export async function purchaseByPlan(plan: PlanType): Promise<boolean> {
  if (!isPurchasesConfigured()) throw new Error('iap_not_configured');
  const pkgs = await getPremiumPackages();
  const pkg = pkgs[plan];
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
