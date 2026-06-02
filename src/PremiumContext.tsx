import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
  const appState = useRef(AppState.currentState);

  const refreshPremium = useCallback(async () => {
    const status = await getIsPremium();
    setIsPremium(status);
  }, []);

  useEffect(() => {
    initPurchases().then(refreshPremium);
  }, [refreshPremium]);

  // Re-validate subscription whenever app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refreshPremium();
      }
      appState.current = next;
    });
    return () => sub.remove();
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
