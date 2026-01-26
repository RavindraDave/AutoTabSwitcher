import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Settings interface matching the extension's storage structure
// Note: Storage uses milliseconds for time values
interface Settings {
  // Basic settings
  delayTime: number; // milliseconds in storage (UI shows seconds)
  enabled: boolean;
  enableOnStartup: boolean;

  // Operating mode
  switchingMode: 'global' | 'window';

  // Pause on activity
  pauseOnActivity: boolean;
  pauseDuration: number; // milliseconds in storage (UI shows seconds)

  // Premium settings
  skipPinnedTabs: boolean;

  // Refresh settings (stored as nested refreshSettings in storage)
  refreshEnabled: boolean;
  refreshStrategy: 'preemptive' | 'post-switch' | 'manual' | 'hybrid';
  preemptiveOffset: number; // milliseconds
}

interface SettingsContextValue {
  settings: Settings;
  isLoading: boolean;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  // Helpers for time conversion (storage uses ms, UI shows seconds)
  getDelayInSeconds: () => number;
  getPauseDurationInSeconds: () => number;
  setDelayInSeconds: (seconds: number) => Promise<void>;
  setPauseDurationInSeconds: (seconds: number) => Promise<void>;
}

// Default delay: 60 seconds = 60000ms
const defaultSettings: Settings = {
  delayTime: 60000, // 60 seconds in ms
  enabled: false,
  enableOnStartup: false,
  switchingMode: 'global',
  pauseOnActivity: false,
  pauseDuration: 30000, // 30 seconds in ms
  skipPinnedTabs: true,
  refreshEnabled: false,
  refreshStrategy: 'post-switch',
  preemptiveOffset: 2000, // 2 seconds in ms
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([
        'delayTime',
        'enabled',
        'enableOnStartup',
        'switchingMode',
        'pauseOnActivity',
        'pauseDuration',
        'skipPinnedTabs',
        'refreshSettings',
      ]);

      // Handle nested refreshSettings
      const refreshSettings = result.refreshSettings || {};

      setSettings({
        delayTime: result.delayTime ?? defaultSettings.delayTime,
        enabled: result.enabled ?? defaultSettings.enabled,
        enableOnStartup: result.enableOnStartup ?? defaultSettings.enableOnStartup,
        switchingMode: result.switchingMode ?? defaultSettings.switchingMode,
        pauseOnActivity: result.pauseOnActivity ?? defaultSettings.pauseOnActivity,
        pauseDuration: result.pauseDuration ?? defaultSettings.pauseDuration,
        skipPinnedTabs: result.skipPinnedTabs ?? defaultSettings.skipPinnedTabs,
        refreshEnabled: refreshSettings.enabled ?? defaultSettings.refreshEnabled,
        refreshStrategy: refreshSettings.strategy ?? defaultSettings.refreshStrategy,
        preemptiveOffset: refreshSettings.preloadTime ?? defaultSettings.preemptiveOffset,
      });
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
      // Handle refresh settings specially (nested object in storage)
      if (key === 'refreshEnabled' || key === 'refreshStrategy' || key === 'preemptiveOffset') {
        const currentRefreshSettings = await chrome.storage.local.get('refreshSettings');
        const updated = {
          ...currentRefreshSettings.refreshSettings,
          ...(key === 'refreshEnabled' && { enabled: value }),
          ...(key === 'refreshStrategy' && { strategy: value }),
          ...(key === 'preemptiveOffset' && { preloadTime: value }),
        };
        await chrome.storage.local.set({ refreshSettings: updated });
      } else {
        await chrome.storage.local.set({ [key]: value });
      }
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    try {
      // Separate refresh settings from other settings
      const refreshKeys = ['refreshEnabled', 'refreshStrategy', 'preemptiveOffset'];
      const refreshUpdates: Record<string, unknown> = {};
      const otherUpdates: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(updates)) {
        if (refreshKeys.includes(key)) {
          if (key === 'refreshEnabled') refreshUpdates.enabled = value;
          if (key === 'refreshStrategy') refreshUpdates.strategy = value;
          if (key === 'preemptiveOffset') refreshUpdates.preloadTime = value;
        } else {
          otherUpdates[key] = value;
        }
      }

      // Update refresh settings if any
      if (Object.keys(refreshUpdates).length > 0) {
        const currentRefreshSettings = await chrome.storage.local.get('refreshSettings');
        await chrome.storage.local.set({
          refreshSettings: {
            ...currentRefreshSettings.refreshSettings,
            ...refreshUpdates,
          },
        });
      }

      // Update other settings
      if (Object.keys(otherUpdates).length > 0) {
        await chrome.storage.local.set(otherUpdates);
      }

      setSettings((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }, []);

  // Helper functions for time conversion
  const getDelayInSeconds = useCallback(() => {
    return Math.round(settings.delayTime / 1000);
  }, [settings.delayTime]);

  const getPauseDurationInSeconds = useCallback(() => {
    return Math.round(settings.pauseDuration / 1000);
  }, [settings.pauseDuration]);

  const setDelayInSeconds = useCallback(async (seconds: number) => {
    await updateSetting('delayTime', seconds * 1000);
  }, [updateSetting]);

  const setPauseDurationInSeconds = useCallback(async (seconds: number) => {
    await updateSetting('pauseDuration', seconds * 1000);
  }, [updateSetting]);

  // Initial load
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for storage changes from other parts of the extension
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;

      setSettings((prev) => {
        let updated = { ...prev };
        let hasChanges = false;

        // Handle direct settings
        const directKeys: (keyof Settings)[] = [
          'delayTime', 'enabled', 'enableOnStartup', 'switchingMode',
          'pauseOnActivity', 'pauseDuration', 'skipPinnedTabs'
        ];

        for (const key of directKeys) {
          if (changes[key]) {
            updated[key] = changes[key].newValue as never;
            hasChanges = true;
          }
        }

        // Handle nested refreshSettings
        if (changes.refreshSettings) {
          const rs = changes.refreshSettings.newValue || {};
          if (rs.enabled !== undefined) {
            updated.refreshEnabled = rs.enabled;
            hasChanges = true;
          }
          if (rs.strategy !== undefined) {
            updated.refreshStrategy = rs.strategy;
            hasChanges = true;
          }
          if (rs.preloadTime !== undefined) {
            updated.preemptiveOffset = rs.preloadTime;
            hasChanges = true;
          }
        }

        return hasChanges ? updated : prev;
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
        refreshSettings: loadSettings,
        getDelayInSeconds,
        getPauseDurationInSeconds,
        setDelayInSeconds,
        setPauseDurationInSeconds,
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
