/**
 * Remote Config Manager - Premium Feature (Phase 2.2)
 *
 * Fetches a JSON config from a user-specified URL on a schedule,
 * validates it against the ConfigExport schema, and applies it
 * (replace or merge). Designed for kiosk fleet management.
 */

import type { ConfigExport, RemoteConfigSyncSettings, StorageData } from '../core/types.js';
import { requirePremiumLicense } from '../core/premium-access.js';
import { logger } from '../core/logger.js';
import {
  REMOTE_CONFIG_ALARM_NAME,
  REMOTE_CONFIG_FETCH_TIMEOUT_MS,
  MAX_REMOTE_CONFIG_SIZE_BYTES,
  MIN_REMOTE_CONFIG_INTERVAL_MINUTES,
  MAX_REMOTE_CONFIG_INTERVAL_MINUTES,
} from '../core/constants.js';

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

function validateConfigExport(obj: unknown): obj is ConfigExport {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  if (typeof c['version'] !== 'string') return false;
  if (typeof c['exportDate'] !== 'number') return false;
  return true;
}

async function getSyncSettings(): Promise<RemoteConfigSyncSettings | undefined> {
  const data = await chrome.storage.local.get('remoteConfigSync') as StorageData;
  return data.remoteConfigSync;
}

async function saveSyncSettings(settings: RemoteConfigSyncSettings): Promise<void> {
  await chrome.storage.local.set({ remoteConfigSync: settings });
}

export async function enableRemoteConfigSync(
  url: string,
  intervalMinutes: number,
  applyMode: 'replace' | 'merge' = 'replace',
  autoApply = true
): Promise<void> {
  await requirePremiumLicense();

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const clampedInterval = Math.max(
    MIN_REMOTE_CONFIG_INTERVAL_MINUTES,
    Math.min(MAX_REMOTE_CONFIG_INTERVAL_MINUTES, intervalMinutes)
  );

  const settings: RemoteConfigSyncSettings = {
    enabled: true,
    url,
    intervalMinutes: clampedInterval,
    applyMode,
    autoApply,
  };

  await saveSyncSettings(settings);
  await chrome.alarms.create(REMOTE_CONFIG_ALARM_NAME, {
    delayInMinutes: clampedInterval,
    periodInMinutes: clampedInterval,
  });

  await logger.info('RemoteConfigManager', 'Remote config sync enabled', {
    url,
    intervalMinutes: clampedInterval,
  });
}

export async function disableRemoteConfigSync(): Promise<void> {
  await chrome.alarms.clear(REMOTE_CONFIG_ALARM_NAME);
  const settings = await getSyncSettings();
  if (settings) {
    await saveSyncSettings({ ...settings, enabled: false });
  }
  await logger.info('RemoteConfigManager', 'Remote config sync disabled');
}

export async function fetchRemoteConfig(): Promise<ConfigExport | null> {
  await requirePremiumLicense();

  const settings = await getSyncSettings();
  if (!settings?.enabled || !settings.url) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_CONFIG_FETCH_TIMEOUT_MS);

    const response = await fetch(settings.url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_REMOTE_CONFIG_SIZE_BYTES) {
      throw new Error(`Response too large: ${contentLength} bytes`);
    }

    const text = await response.text();
    if (text.length > MAX_REMOTE_CONFIG_SIZE_BYTES) {
      throw new Error(`Response too large: ${text.length} bytes`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response');
    }

    if (!validateConfigExport(parsed)) {
      throw new Error('Response does not match expected config schema (missing version or exportDate)');
    }

    const configHash = hashString(text);

    await saveSyncSettings({
      ...settings,
      lastFetchTime: Date.now(),
      lastFetchStatus: 'success',
      lastFetchError: undefined,
    });

    if (configHash === settings.lastAppliedHash) {
      await logger.info('RemoteConfigManager', 'Config unchanged, skipping apply');
      return null;
    }

    if (settings.autoApply) {
      await applyRemoteConfig(parsed, settings.applyMode);
      await saveSyncSettings({
        ...settings,
        lastFetchTime: Date.now(),
        lastFetchStatus: 'success',
        lastFetchError: undefined,
        lastAppliedHash: configHash,
        pendingConfig: undefined,
      });
    } else {
      await saveSyncSettings({
        ...settings,
        lastFetchTime: Date.now(),
        lastFetchStatus: 'success',
        lastFetchError: undefined,
        pendingConfig: parsed,
      });
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await saveSyncSettings({
      ...settings,
      lastFetchTime: Date.now(),
      lastFetchStatus: 'error',
      lastFetchError: message,
    });
    await logger.error('RemoteConfigManager', 'Fetch failed', { error: message });
    return null;
  }
}

export async function applyRemoteConfig(
  config: ConfigExport,
  mode: 'replace' | 'merge' = 'replace'
): Promise<void> {
  await requirePremiumLicense();

  const updates: Partial<StorageData> = {};

  if (config.settings) {
    if (config.settings.delayTime !== undefined) updates.delayTime = config.settings.delayTime;
    if (config.settings.switchingMode !== undefined) updates.switchingMode = config.settings.switchingMode;
    if (config.settings.pauseOnActivity !== undefined) updates.pauseOnActivity = config.settings.pauseOnActivity;
    if (config.settings.pauseDuration !== undefined) updates.pauseDuration = config.settings.pauseDuration;
    if (config.settings.enableOnStartup !== undefined) updates.enableOnStartup = config.settings.enableOnStartup;
    if (config.settings.skipPinnedTabs !== undefined) updates.skipPinnedTabs = config.settings.skipPinnedTabs;
  }

  if (config.skipRules) {
    if (mode === 'replace') {
      updates.skipRules = config.skipRules;
    } else {
      const data = await chrome.storage.local.get('skipRules') as StorageData;
      const existing = data.skipRules ?? [];
      const existingIds = new Set(existing.map(r => r.id));
      const merged = [...existing, ...config.skipRules.filter(r => !existingIds.has(r.id))];
      updates.skipRules = merged;
    }
  }

  if (config.refreshSettings) {
    updates.refreshSettings = config.refreshSettings;
  }

  if (config.refreshRules) {
    if (mode === 'replace') {
      updates.refreshRules = config.refreshRules;
    } else {
      const data = await chrome.storage.local.get('refreshRules') as StorageData;
      const existing = data.refreshRules ?? [];
      const existingIds = new Set(existing.map(r => r.id));
      const merged = [...existing, ...config.refreshRules.filter(r => !existingIds.has(r.id))];
      updates.refreshRules = merged;
    }
  }

  if (config.savedSessions) {
    if (mode === 'replace') {
      updates.savedSessions = config.savedSessions;
    } else {
      const data = await chrome.storage.local.get('savedSessions') as StorageData;
      const existing = data.savedSessions ?? [];
      const existingIds = new Set(existing.map(s => s.id));
      const merged = [...existing, ...config.savedSessions.filter(s => !existingIds.has(s.id))];
      updates.savedSessions = merged;
    }
  }

  if (config.schedules) {
    if (mode === 'replace') {
      updates.schedules = config.schedules;
    } else {
      const data = await chrome.storage.local.get('schedules') as StorageData;
      const existing = data.schedules ?? [];
      const existingIds = new Set(existing.map(s => s.id));
      const merged = [...existing, ...config.schedules.filter(s => !existingIds.has(s.id))];
      updates.schedules = merged;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }

  await logger.info('RemoteConfigManager', 'Applied remote config', {
    mode,
    keys: Object.keys(updates),
  });
}

export async function applyPendingConfig(): Promise<boolean> {
  await requirePremiumLicense();

  const settings = await getSyncSettings();
  if (!settings?.pendingConfig) {
    return false;
  }

  await applyRemoteConfig(settings.pendingConfig, settings.applyMode);

  const text = JSON.stringify(settings.pendingConfig);
  await saveSyncSettings({
    ...settings,
    lastAppliedHash: hashString(text),
    pendingConfig: undefined,
  });

  return true;
}

export async function handleRemoteConfigAlarm(): Promise<void> {
  const settings = await getSyncSettings();
  if (!settings?.enabled) return;

  try {
    await fetchRemoteConfig();
  } catch (error) {
    await logger.error('RemoteConfigManager', 'Alarm handler failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function initRemoteConfigSync(): Promise<void> {
  const settings = await getSyncSettings();
  if (!settings?.enabled) return;

  const alarm = await chrome.alarms.get(REMOTE_CONFIG_ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(REMOTE_CONFIG_ALARM_NAME, {
      delayInMinutes: settings.intervalMinutes,
      periodInMinutes: settings.intervalMinutes,
    });
    await logger.info('RemoteConfigManager', 'Re-initialized alarm on startup');
  }
}

export async function fetchNow(): Promise<ConfigExport | null> {
  return fetchRemoteConfig();
}
