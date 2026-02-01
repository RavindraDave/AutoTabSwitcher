import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PREMIUM_FEATURES_AVAILABLE, BUILD_TYPE } from '../../core/build-config';

interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  licenseKey: string | null;
  activateLicense: (key: string) => Promise<boolean>;
  deactivateLicense: () => Promise<void>;
  checkPremiumStatus: () => Promise<void>;
  openPremiumPage: () => void;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

// In development builds, auto-enable premium for testing
const IS_DEV_BUILD = BUILD_TYPE === 'development';

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(IS_DEV_BUILD);
  const [isLoading, setIsLoading] = useState(!IS_DEV_BUILD);
  const [licenseKey, setLicenseKey] = useState<string | null>(IS_DEV_BUILD ? 'DEV-LICENSE' : null);

  const checkPremiumStatus = useCallback(async () => {
    // In dev builds, premium is always enabled
    if (IS_DEV_BUILD) {
      setIsPremium(true);
      setLicenseKey('DEV-LICENSE');
      setIsLoading(false);
      return;
    }

    if (!PREMIUM_FEATURES_AVAILABLE) {
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    try {
      const result = await chrome.storage.local.get(['premiumEnabled', 'licenseKey']);
      setIsPremium(result.premiumEnabled === true);
      setLicenseKey(result.licenseKey || null);
    } catch (error) {
      console.error('Failed to check premium status:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateLicense = useCallback(async (key: string): Promise<boolean> => {
    if (!PREMIUM_FEATURES_AVAILABLE) {
      return false;
    }

    try {
      // In a real implementation, you would validate the license key with a server
      // For now, we'll just check if it's a non-empty string
      if (!key || key.trim().length === 0) {
        return false;
      }

      await chrome.storage.local.set({
        licenseKey: key.trim(),
        premiumEnabled: true,
      });

      setLicenseKey(key.trim());
      setIsPremium(true);
      return true;
    } catch (error) {
      console.error('Failed to activate license:', error);
      return false;
    }
  }, []);

  const deactivateLicense = useCallback(async () => {
    try {
      await chrome.storage.local.set({
        licenseKey: null,
        premiumEnabled: false,
      });

      setLicenseKey(null);
      setIsPremium(false);
    } catch (error) {
      console.error('Failed to deactivate license:', error);
    }
  }, []);

  const openPremiumPage = useCallback(() => {
    // Navigate to the premium activation section within the settings
    window.location.hash = '#/premium/activate';
  }, []);

  // Initial load
  useEffect(() => {
    checkPremiumStatus();
  }, [checkPremiumStatus]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;

      if (changes.premiumEnabled) {
        setIsPremium(changes.premiumEnabled.newValue === true);
      }
      if (changes.licenseKey) {
        setLicenseKey(changes.licenseKey.newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        licenseKey,
        activateLicense,
        deactivateLicense,
        checkPremiumStatus,
        openPremiumPage,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
