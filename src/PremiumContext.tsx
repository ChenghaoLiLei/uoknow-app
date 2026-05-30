import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initPurchases, getIsPremium } from './utils/purchases';

interface PremiumContextValue {
  isPremium: boolean;
  refreshPremium: () => Promise<void>;
}

export const PremiumContext = createContext<PremiumContextValue>({
  isPremium: false,
  refreshPremium: async () => {},
});

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  const refreshPremium = useCallback(async () => {
    const status = await getIsPremium();
    setIsPremium(status);
  }, []);

  useEffect(() => {
    initPurchases().then(refreshPremium);
  }, [refreshPremium]);

  return (
    <PremiumContext.Provider value={{ isPremium, refreshPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
