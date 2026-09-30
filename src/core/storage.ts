/**
 * Storage management helpers
 */

import { StorageData, SwitchingMode, OperatingMode, TabStatistics, TabDelayEntry, AudioManagementMode } from './types.js';
import {
  DEFAULT_ENABLED,
  DEFAULT_ENABLE_ON_STARTUP,
  DEFAULT_WINDOW_MODE,
  DEFAULT_SWITCHING_MODE,
  DEFAULT_OPERATING_MODE,
  DEFAULT_PAUSE_ON_ACTIVITY,
  DEFAULT_PAUSE_DURATION,
  MIN_DELAY_MS_PRODUCTION,
  DEFAULT_IDLE_AUTO_START,
  DEFAULT_IDLE_THRESHOLD_SECONDS,
  DEFAULT_IDLE_STOP_ON_ACTIVE,
  DEFAULT_SWITCH_NOTIFICATION,
  DEFAULT_CONTEXT_MENU_ENABLED,
  MAX_TAB_DELAY_ENTRIES,
  MAX_TAB_DELAY_LABEL_LENGTH,
  DEFAULT_AUDIO_MANAGEMENT,
} from './constants.js';
import { normalizeUrlKey } from './url-normalizer.js';
import { logger } from './logger.js';

/**
 * Get the minimum delay time based on environment
 * IMPORTANT: This ensures delays respect environment-specific minimums
 * FIXED: Now matches UI validation logic for consistency
 *
 * @returns Minimum delay in milliseconds (2s for both development and production)
 */
export function getMinDelayMs(): number {
  // Use same minimum as UI validation to prevent silent clamping
  // Both development and production now use 2-second minimum
  return MIN_DELAY_MS_PRODUCTION;
}

/**
 * Clamp delay time to environment-specific minimum
 * SECURITY: Ensures delay times are always valid for the current environment
 * and compatible with Chrome alarms API constraints
 *
 * @param delayMs - The delay time in milliseconds
 * @returns Clamped delay time (>= MIN_DELAY_MS for current environment)
 */
export function clampDelayTime(delayMs: number): number {
  const minDelayMs = getMinDelayMs();
  const clamped = Math.max(delayMs, minDelayMs);

  if (clamped !== delayMs) {
    logger.info('Storage', 'Clamped delayTime to minimum', {
      originalMs: delayMs,
      clampedMs: clamped,
      minDelayMs
    });
  }

  return clamped;
}

/**
 * Validate and sanitize operating mode value
 * SECURITY: Prevents invalid values from storage being used
 *
 * @param value - The operating mode value to validate
 * @returns Valid operating mode ('global' or 'window')
 */
export function validateOperatingMode(value: any): OperatingMode {
  if (value === 'global' || value === 'window') {
    return value;
  }
  logger.warn('Storage', 'Invalid operating mode value, defaulting to global', {
    invalidValue: value,
    defaulting: DEFAULT_OPERATING_MODE
  });
  return DEFAULT_OPERATING_MODE;
}

/**
 * Validate window ID
 * SECURITY: Ensures windowId is a valid number
 *
 * @param windowId - The window ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidWindowId(windowId: any): windowId is number {
  return typeof windowId === 'number' && !isNaN(windowId) && isFinite(windowId) && windowId > 0;
}

/**
 * Check if a window exists
 * SECURITY: Validates window existence before operations
 *
 * @param windowId - The window ID to check
 * @returns true if window exists, false otherwise
 */
export async function windowExists(windowId: number): Promise<boolean> {
  if (!isValidWindowId(windowId)) {
    return false;
  }

  try {
    await chrome.windows.get(windowId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize default storage values on extension install
 * ROBUST: Clamps defaultDelayTime to environment-specific minimum
 * DEV: Auto-enables premium features in development builds
 *
 * @param defaultDelayTime - The default delay time in milliseconds
 */
export async function initializeStorage(defaultDelayTime: number): Promise<void> {
  const clampedDelayTime = clampDelayTime(defaultDelayTime);

  // Check if this is a development build
  let isDevelopmentBuild = false;
  try {
    const { BUILD_TYPE } = await import('./build-config.js');
    isDevelopmentBuild = BUILD_TYPE.includes('development');
  } catch {
    // build-config not available, assume production
  }

  await chrome.storage.local.set({
    enabled: DEFAULT_ENABLED,
    enableOnStartup: DEFAULT_ENABLE_ON_STARTUP,
    delayTime: clampedDelayTime,
    windowMode: DEFAULT_WINDOW_MODE, // Legacy field
    switchingMode: DEFAULT_SWITCHING_MODE, // Primary mode field
    operatingMode: DEFAULT_SWITCHING_MODE, // DEPRECATED: Kept for backward compatibility
    selectedWindowId: undefined,
    pauseOnActivity: DEFAULT_PAUSE_ON_ACTIVITY,
    pauseDuration: DEFAULT_PAUSE_DURATION,
    windowStates: {}, // Initialize empty window states
    lastSwitchTimes: {}, // BUGFIX: Initialize lastSwitchTimes on fresh install
    // New features defaults
    idleAutoStart: DEFAULT_IDLE_AUTO_START,
    idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
    idleStopOnActive: DEFAULT_IDLE_STOP_ON_ACTIVE,
    switchNotification: DEFAULT_SWITCH_NOTIFICATION,
    contextMenuEnabled: DEFAULT_CONTEXT_MENU_ENABLED,
    tabStatistics: {
      totalSwitches: 0,
      totalCycles: 0,
      sessionStartTime: Date.now(),
      lastResetTime: Date.now(),
      perTabVisits: {},
    },
  });

  if (isDevelopmentBuild) {
    logger.info('Storage', 'Development build detected - premium features auto-enabled');
  }
}

/**
 * Get settings from storage with defaults
 *
 * @param keys - Storage keys to retrieve
 * @returns Storage data with defaults applied
 */
export async function getSettings(keys: (keyof StorageData)[]): Promise<StorageData> {
  return await chrome.storage.local.get(keys) as StorageData;
}

/**
 * Set delay time in storage with automatic clamping
 * ROBUST: This is the recommended way to save delayTime to ensure it's always valid
 * SECURITY: Automatically clamps to environment-specific minimum
 *
 * @param delayMs - The delay time in milliseconds
 * @param additionalSettings - Optional additional settings to save atomically
 * @returns The clamped delay time that was actually saved
 */
export async function setDelayTime(
  delayMs: number,
  additionalSettings?: Partial<StorageData>
): Promise<number> {
  const clampedDelayMs = clampDelayTime(delayMs);

  await chrome.storage.local.set({
    ...additionalSettings,
    delayTime: clampedDelayMs,
  });

  return clampedDelayMs;
}

/**
 * Get the current switching mode with backward compatibility
 * Checks switchingMode first, then falls back to operatingMode (old field name), then windowMode (legacy)
 * BACKWARD COMPATIBLE: Supports switchingMode, operatingMode, and windowMode
 *
 * @param data - Storage data that may contain switching mode fields
 * @returns The current switching mode ('global' or 'window')
 */
export function getSwitchingMode(data: StorageData): SwitchingMode {
  // Priority: switchingMode (new) > operatingMode (deprecated) > DEFAULT
  if (data.switchingMode) {
    return data.switchingMode;
  }
  if (data.operatingMode) {
    return data.operatingMode;
  }
  // Fallback to legacy windowMode if neither new field is set
  if (data.windowMode) {
    return data.windowMode === 'current-window' ? 'window' : 'global';
  }
  return DEFAULT_SWITCHING_MODE;
}

/**
 * Migrate existing users to the new switching mode system
 * Migrates from operatingMode (old name) or windowMode (legacy) to switchingMode (new name)
 * NON-BREAKING: Only adds new fields, keeps old fields for backward compatibility
 */
export async function migrateToSwitchingMode(): Promise<void> {
  const data = await chrome.storage.local.get(['switchingMode', 'operatingMode', 'windowMode', 'windowStates']) as StorageData;

  // Only migrate if switchingMode is not set
  if (data.switchingMode === undefined) {
    const modeToUse = getSwitchingMode(data);

    await chrome.storage.local.set({
      switchingMode: modeToUse,
      operatingMode: modeToUse, // Keep for backward compat
      windowStates: data.windowStates || {},
    });

    if (data.operatingMode) {
      await logger.info('Migration', 'Migrated operatingMode to switchingMode', {
        from: data.operatingMode,
        to: modeToUse
      });
    } else if (data.windowMode) {
      await logger.info('Migration', 'Migrated windowMode to switchingMode', {
        from: data.windowMode,
        to: modeToUse
      });
    } else {
      await logger.info('Migration', 'Initialized switching mode system', {
        defaultMode: modeToUse
      });
    }
  }
}

/**
 * @deprecated Use migrateToSwitchingMode instead
 * Kept for backward compatibility with older code
 */
export async function migrateToOperatingMode(): Promise<void> {
  await migrateToSwitchingMode();
}

// ============================================================================
// PREMIUM FEATURES - PHASE 1 STORAGE HELPERS
// ============================================================================

/**
 * Session Management Storage Helpers
 */

/**
 * Get all saved sessions
 */
export async function getSavedSessions(): Promise<import('./types.js').SavedSession[]> {
  const data = await chrome.storage.local.get('savedSessions') as StorageData;
  return data.savedSessions || [];
}

/**
 * Save a session
 */
export async function saveSession(session: import('./types.js').SavedSession): Promise<void> {
  const sessions = await getSavedSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  await chrome.storage.local.set({ savedSessions: sessions });
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSavedSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ savedSessions: filtered });
}

/**
 * Get auto-launch session IDs
 */
export async function getAutoLaunchSessionIds(): Promise<string[]> {
  const data = await chrome.storage.local.get('autoLaunchSessionIds') as StorageData;
  return data.autoLaunchSessionIds || [];
}

/**
 * Set auto-launch session IDs
 */
export async function setAutoLaunchSessionIds(sessionIds: string[]): Promise<void> {
  await chrome.storage.local.set({ autoLaunchSessionIds: sessionIds });
}

/**
 * Smart Auto-Refresh Storage Helpers
 */

/**
 * Get refresh settings
 */
export async function getRefreshSettings(): Promise<import('./types.js').RefreshSettings | null> {
  const data = await chrome.storage.local.get('refreshSettings') as StorageData;
  return data.refreshSettings || null;
}

/**
 * Set refresh settings
 */
export async function setRefreshSettings(settings: import('./types.js').RefreshSettings): Promise<void> {
  await chrome.storage.local.set({ refreshSettings: settings });
}

/**
 * Get refresh rules
 */
export async function getRefreshRules(): Promise<import('./types.js').RefreshRule[]> {
  const data = await chrome.storage.local.get('refreshRules') as StorageData;
  return data.refreshRules || [];
}

/**
 * Save a refresh rule
 */
export async function saveRefreshRule(rule: import('./types.js').RefreshRule): Promise<void> {
  const rules = await getRefreshRules();
  const existingIndex = rules.findIndex(r => r.id === rule.id);

  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }

  await chrome.storage.local.set({ refreshRules: rules });
}

/**
 * Delete a refresh rule
 */
export async function deleteRefreshRule(ruleId: string): Promise<void> {
  const rules = await getRefreshRules();
  const filtered = rules.filter(r => r.id !== ruleId);
  await chrome.storage.local.set({ refreshRules: filtered });
}

/**
 * Get tab refresh state
 */
export async function getTabRefreshState(tabId: number): Promise<import('./types.js').TabRefreshState | null> {
  const data = await chrome.storage.local.get('tabRefreshStates') as StorageData;
  return data.tabRefreshStates?.[tabId] || null;
}

/**
 * Set tab refresh state
 */
export async function setTabRefreshState(tabId: number, state: import('./types.js').TabRefreshState): Promise<void> {
  const data = await chrome.storage.local.get('tabRefreshStates') as StorageData;
  const states = data.tabRefreshStates || {};
  states[tabId] = state;
  await chrome.storage.local.set({ tabRefreshStates: states });
}

/**
 * Skip Rules Storage Helpers
 */

/**
 * Get skip rules
 */
export async function getSkipRules(): Promise<import('./types.js').SkipRule[]> {
  const data = await chrome.storage.local.get('skipRules') as StorageData;
  return data.skipRules || [];
}

/**
 * Save a skip rule
 */
export async function saveSkipRule(rule: import('./types.js').SkipRule): Promise<void> {
  const rules = await getSkipRules();
  const existingIndex = rules.findIndex(r => r.id === rule.id);

  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }

  await chrome.storage.local.set({ skipRules: rules });
}

/**
 * Delete a skip rule
 */
export async function deleteSkipRule(ruleId: string): Promise<void> {
  const rules = await getSkipRules();
  const filtered = rules.filter(r => r.id !== ruleId);
  await chrome.storage.local.set({ skipRules: filtered });
}

/**
 * Get skip pinned tabs setting
 */
export async function getSkipPinnedTabs(): Promise<boolean> {
  const data = await chrome.storage.local.get('skipPinnedTabs') as StorageData;
  return data.skipPinnedTabs || false;
}

/**
 * Set skip pinned tabs setting
 */
export async function setSkipPinnedTabs(skip: boolean): Promise<void> {
  await chrome.storage.local.set({ skipPinnedTabs: skip });
}

/**
 * Import/Export Storage Helpers
 */

/**
 * Get config version
 */
export async function getConfigVersion(): Promise<string> {
  const data = await chrome.storage.local.get('configVersion') as StorageData;
  return data.configVersion || '1.0.0';
}

/**
 * Set config version
 */
export async function setConfigVersion(version: string): Promise<void> {
  await chrome.storage.local.set({ configVersion: version });
}

/**
 * Create a backup of current configuration
 */
export async function createConfigBackup(reason: 'manual' | 'pre-import' | 'scheduled'): Promise<import('./types.js').ConfigBackup> {
  const data = await chrome.storage.local.get(null) as StorageData;
  const now = Date.now();

  const backup: import('./types.js').ConfigBackup = {
    id: `backup-${now}`,
    timestamp: now,
    config: {
      version: await getConfigVersion(),
      exportDate: now,
      settings: {
        delayTime: data.delayTime,
        switchingMode: data.switchingMode,
        pauseOnActivity: data.pauseOnActivity,
        pauseDuration: data.pauseDuration,
        enableOnStartup: data.enableOnStartup,
        skipPinnedTabs: data.skipPinnedTabs,
      },
      savedSessions: data.savedSessions,
      refreshSettings: data.refreshSettings,
      refreshRules: data.refreshRules,
      skipRules: data.skipRules,
    },
    reason,
    autoBackup: reason !== 'manual',
  };

  await chrome.storage.local.set({ lastBackupTime: now });

  return backup;
}

/**
 * Premium Feature Flags
 */

/**
 * Check if premium features are enabled
 */
export async function isPremiumEnabled(): Promise<boolean> {
  // All features are free and always enabled.
  return true;
}

/**
 * Set premium enabled status
 */
export async function setPremiumEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ premiumEnabled: enabled });
  logger.info('Premium', `Premium features ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get license key
 */
export async function getLicenseKey(): Promise<string | null> {
  const data = await chrome.storage.local.get('licenseKey') as StorageData;
  return data.licenseKey || null;
}

/**
 * Set license key
 */
export async function setLicenseKey(key: string): Promise<void> {
  await chrome.storage.local.set({ licenseKey: key });
  logger.info('Premium', 'License key updated');
}

// ============================================================================
// NEW FEATURES - STORAGE HELPERS
// ============================================================================

/**
 * Get tab statistics
 */
export async function getTabStatistics(): Promise<TabStatistics> {
  const data = await chrome.storage.local.get('tabStatistics') as StorageData;
  return data.tabStatistics || {
    totalSwitches: 0,
    totalCycles: 0,
    sessionStartTime: Date.now(),
    lastResetTime: Date.now(),
    perTabVisits: {},
  };
}

/**
 * Update tab statistics after a switch
 */
export async function updateTabStatistics(
  tabId: number,
  tabTitle: string,
  totalTabsInWindow: number,
  previousTabId?: number
): Promise<void> {
  const stats = await getTabStatistics();

  stats.totalSwitches++;

  // Update per-tab visits for the new tab
  const now = Date.now();
  if (!stats.perTabVisits[tabId]) {
    stats.perTabVisits[tabId] = {
      visitCount: 0,
      totalViewTime: 0,
      lastVisitTime: now,
      tabTitle,
    };
  }
  stats.perTabVisits[tabId].visitCount++;
  stats.perTabVisits[tabId].lastVisitTime = now;
  stats.perTabVisits[tabId].tabTitle = tabTitle;

  // Update view time for the previous tab
  if (previousTabId && stats.perTabVisits[previousTabId]) {
    const lastVisit = stats.perTabVisits[previousTabId].lastVisitTime;
    if (lastVisit > 0) {
      stats.perTabVisits[previousTabId].totalViewTime += (now - lastVisit);
    }
  }

  // Check if a full cycle completed (every N switches where N = tab count)
  if (totalTabsInWindow > 0 && stats.totalSwitches % totalTabsInWindow === 0) {
    stats.totalCycles++;
  }

  // Prune old entries if too many
  const entries = Object.entries(stats.perTabVisits);
  if (entries.length > 200) {
    // Keep only the most recently visited tabs
    const sorted = entries.sort(([, a], [, b]) => b.lastVisitTime - a.lastVisitTime);
    stats.perTabVisits = Object.fromEntries(sorted.slice(0, 150));
  }

  await chrome.storage.local.set({ tabStatistics: stats });
}

/**
 * Reset tab statistics
 */
export async function resetTabStatistics(): Promise<void> {
  const now = Date.now();
  await chrome.storage.local.set({
    tabStatistics: {
      totalSwitches: 0,
      totalCycles: 0,
      sessionStartTime: now,
      lastResetTime: now,
      perTabVisits: {},
    },
  });
  logger.info('Statistics', 'Tab statistics reset');
}

/**
 * Get idle auto-start settings
 */
export async function getIdleSettings(): Promise<{
  idleAutoStart: boolean;
  idleThresholdSeconds: number;
  idleStopOnActive: boolean;
}> {
  const data = await chrome.storage.local.get([
    'idleAutoStart', 'idleThresholdSeconds', 'idleStopOnActive'
  ]) as StorageData;
  return {
    idleAutoStart: data.idleAutoStart ?? DEFAULT_IDLE_AUTO_START,
    idleThresholdSeconds: data.idleThresholdSeconds ?? DEFAULT_IDLE_THRESHOLD_SECONDS,
    idleStopOnActive: data.idleStopOnActive ?? DEFAULT_IDLE_STOP_ON_ACTIVE,
  };
}

/**
 * Get switch notification setting
 */
export async function getSwitchNotification(): Promise<boolean> {
  const data = await chrome.storage.local.get('switchNotification') as StorageData;
  return data.switchNotification ?? DEFAULT_SWITCH_NOTIFICATION;
}

/**
 * Get context menu enabled setting
 */
export async function getContextMenuEnabled(): Promise<boolean> {
  const data = await chrome.storage.local.get('contextMenuEnabled') as StorageData;
  return data.contextMenuEnabled ?? DEFAULT_CONTEXT_MENU_ENABLED;
}

// ============================================================================
// PHASE 1.1 — PER-TAB CUSTOM DISPLAY TIME STORAGE HELPERS
// ============================================================================

/**
 * Get all per-tab delay entries keyed by normalized URL.
 */
export async function getTabDelays(): Promise<{ [urlKey: string]: TabDelayEntry }> {
  const data = await chrome.storage.local.get('tabDelays') as StorageData;
  return data.tabDelays || {};
}

/**
 * Look up the delay (ms) for a given URL, or null if none is set.
 */
export async function getTabDelayForUrl(url: string | undefined | null): Promise<number | null> {
  const key = normalizeUrlKey(url);
  if (!key) return null;
  const delays = await getTabDelays();
  const entry = delays[key];
  return entry ? entry.delay : null;
}

/**
 * Create or update a per-tab delay entry.
 *
 * @param url - Raw URL (will be normalized to a key)
 * @param delayMs - Delay in milliseconds (will be clamped to the environment minimum)
 * @param label - Optional user-supplied display label
 * @returns The normalized URL key that was stored
 * @throws Error if the URL is not eligible or if the max entry count is exceeded
 */
export async function setTabDelay(
  url: string,
  delayMs: number,
  label?: string
): Promise<string> {
  const key = normalizeUrlKey(url);
  if (!key) {
    throw new Error('URL is not eligible for a per-tab delay');
  }

  const clamped = clampDelayTime(delayMs);
  const delays = await getTabDelays();
  const existing = delays[key];

  if (!existing && Object.keys(delays).length >= MAX_TAB_DELAY_ENTRIES) {
    throw new Error(`Maximum of ${MAX_TAB_DELAY_ENTRIES} per-tab delays reached`);
  }

  // Validate and trim label
  let safeLabel: string | undefined;
  if (typeof label === 'string') {
    const trimmed = label.trim();
    if (trimmed.length > 0) {
      safeLabel = trimmed.slice(0, MAX_TAB_DELAY_LABEL_LENGTH);
    }
  }

  const now = Date.now();
  const entry: TabDelayEntry = {
    url: key,
    delay: clamped,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(safeLabel !== undefined ? { label: safeLabel } : existing?.label ? { label: existing.label } : {}),
  };

  delays[key] = entry;
  await chrome.storage.local.set({ tabDelays: delays });

  await logger.info('Storage', 'Per-tab delay saved', {
    urlKey: key,
    delayMs: clamped,
    hasLabel: safeLabel !== undefined,
  });

  return key;
}

/**
 * Delete a per-tab delay entry.
 *
 * @param urlKey - Normalized URL key (as stored, not raw URL)
 */
export async function deleteTabDelay(urlKey: string): Promise<void> {
  const delays = await getTabDelays();
  if (!delays[urlKey]) {
    return;
  }
  delete delays[urlKey];
  await chrome.storage.local.set({ tabDelays: delays });
  await logger.info('Storage', 'Per-tab delay deleted', { urlKey });
}

/**
 * Remove all per-tab delay entries.
 */
export async function clearAllTabDelays(): Promise<void> {
  await chrome.storage.local.set({ tabDelays: {} });
  await logger.info('Storage', 'All per-tab delays cleared');
}

// ============================================================================
// PHASE 1.2 — SMART AUDIO MANAGEMENT STORAGE HELPERS
// ============================================================================

/**
 * Get the current audio management mode.
 */
export async function getAudioManagementMode(): Promise<AudioManagementMode> {
  const data = await chrome.storage.local.get('audioManagement') as StorageData;
  return data.audioManagement ?? DEFAULT_AUDIO_MANAGEMENT;
}

/**
 * Set the audio management mode.
 */
export async function setAudioManagementMode(mode: AudioManagementMode): Promise<void> {
  await chrome.storage.local.set({ audioManagement: mode });
  await logger.info('Storage', 'Audio management mode updated', { mode });
}
