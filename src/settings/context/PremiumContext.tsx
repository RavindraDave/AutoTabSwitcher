import React, { createContext, useContext } from 'react';

/**
 * Every feature is free and always available, so there is no activation or
 * licence state. The context is kept so existing components can still read it.
 */
interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
}

const PremiumContext = createContext<PremiumContextValue>({ isPremium: true, isLoading: false });

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  return (
    <PremiumContext.Provider value={{ isPremium: true, isLoading: false }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
