/**
 * Storage management helpers
 */

import { StorageData, OperatingMode } from './types.js';
import {
  DEFAULT_ENABLED,
  DEFAULT_ENABLE_ON_STARTUP,
  DEFAULT_WINDOW_MODE,
  DEFAULT_OPERATING_MODE,
  DEFAULT_PAUSE_ON_ACTIVITY,
  DEFAULT_PAUSE_DURATION,
} from './constants.js';

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
  console.warn(`Invalid operating mode value: ${value}, defaulting to 'global'`);
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
 *
 * @param defaultDelayTime - The default delay time in milliseconds
 */
export async function initializeStorage(defaultDelayTime: number): Promise<void> {
  await chrome.storage.local.set({
    enabled: DEFAULT_ENABLED,
    enableOnStartup: DEFAULT_ENABLE_ON_STARTUP,
    delayTime: defaultDelayTime,
    windowMode: DEFAULT_WINDOW_MODE, // Legacy field
    operatingMode: DEFAULT_OPERATING_MODE, // New mode system
    selectedWindowId: undefined,
    pauseOnActivity: DEFAULT_PAUSE_ON_ACTIVITY,
    pauseDuration: DEFAULT_PAUSE_DURATION,
    windowStates: {}, // Initialize empty window states
  });
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
 * Migrate existing users to the new operating mode system
 * This ensures backward compatibility by defaulting to 'global' mode
 * NON-BREAKING: Only adds new fields, never modifies existing settings
 */
export async function migrateToOperatingMode(): Promise<void> {
  const data = await chrome.storage.local.get(['operatingMode', 'enabled', 'windowStates']) as StorageData;

  // Only migrate if operatingMode is not set (first time after update)
  if (data.operatingMode === undefined) {
    // Default to 'global' mode to preserve current behavior
    await chrome.storage.local.set({
      operatingMode: DEFAULT_OPERATING_MODE,
      windowStates: data.windowStates || {}, // Initialize if missing
    });

    console.log('[AutoTabSwitcher] Migrated to new operating mode system (default: global)');
  }
}
