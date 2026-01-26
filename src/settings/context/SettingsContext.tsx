import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Settings interface matching the extension's storage structure
interface Settings {
  // Basic settings
  delayTime: number;
  enabled: boolean;
  enableOnStartup: boolean;

  // Operating mode
  switchingMode: 'global' | 'window';

  // Pause on activity
  pauseOnActivity: boolean;
  pauseDuration: number;

  // Premium settings
  skipPinnedTabs: boolean;
  refreshEnabled: boolean;
  refreshStrategy: 'preemptive' | 'post-switch' | 'manual' | 'hybrid';
  refreshInterval: number;
}

interface SettingsContextValue {
  settings: Settings;
  isLoading: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  delayTime: 60,
  enabled: false,
  enableOnStartup: false,
  switchingMode: 'global',
  pauseOnActivity: false,
  pauseDuration: 30,
  skipPinnedTabs: true,
  refreshEnabled: false,
  refreshStrategy: 'post-switch',
  refreshInterval: 300,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(Object.keys(defaultSettings));

      setSettings((prev) => ({
        ...prev,
        delayTime: result.delayTime ?? prev.delayTime,
        enabled: result.enabled ?? prev.enabled,
        enableOnStartup: result.enableOnStartup ?? prev.enableOnStartup,
        switchingMode: result.switchingMode ?? prev.switchingMode,
        pauseOnActivity: result.pauseOnActivity ?? prev.pauseOnActivity,
        pauseDuration: result.pauseDuration ?? prev.pauseDuration,
        skipPinnedTabs: result.skipPinnedTabs ?? prev.skipPinnedTabs,
        refreshEnabled: result.refreshEnabled ?? prev.refreshEnabled,
        refreshStrategy: result.refreshStrategy ?? prev.refreshStrategy,
        refreshInterval: result.refreshInterval ?? prev.refreshInterval,
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSetting = useCallback(async <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    try {
      await chrome.storage.local.set({ [key]: value });
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    try {
      await chrome.storage.local.set(updates);
      setSettings((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Listen for storage changes from other parts of the extension
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;

      setSettings((prev) => {
        const updates: Partial<Settings> = {};

        for (const key of Object.keys(changes)) {
          if (key in defaultSettings) {
            updates[key as keyof Settings] = changes[key]?.newValue;
          }
        }

        if (Object.keys(updates).length === 0) return prev;
        return { ...prev, ...updates };
      });
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSetting,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
