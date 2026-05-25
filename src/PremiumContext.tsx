import React, { createContext, useContext, useState } from 'react';

interface PremiumContextValue {
  isPremium: boolean;
  // Will be wired to RevenueCat when Apple Developer account is activated
}

export const PremiumContext = createContext<PremiumContextValue>({ isPremium: false });

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  // Hardcoded false until RevenueCat is integrated (pending Apple Developer account)
  const [isPremium] = useState(false);

  return (
    <PremiumContext.Provider value={{ isPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
