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
  MIN_DELAY_MS_DEVELOPMENT,
  MIN_DELAY_MS_PRODUCTION,
} from './constants.js';
import { isPacked } from '../utils/environment.js';

/**
 * Get the minimum delay time based on environment
 * IMPORTANT: This ensures delays respect environment-specific minimums
 *
 * @returns Minimum delay in milliseconds (60s for development, 5s for production)
 */
export function getMinDelayMs(): number {
  return isPacked() ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
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
    console.log(`[Storage] Clamped delayTime from ${delayMs}ms to ${clamped}ms (min: ${minDelayMs}ms)`);
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
 * ROBUST: Clamps defaultDelayTime to environment-specific minimum
 *
 * @param defaultDelayTime - The default delay time in milliseconds
 */
export async function initializeStorage(defaultDelayTime: number): Promise<void> {
  const clampedDelayTime = clampDelayTime(defaultDelayTime);

  await chrome.storage.local.set({
    enabled: DEFAULT_ENABLED,
    enableOnStartup: DEFAULT_ENABLE_ON_STARTUP,
    delayTime: clampedDelayTime,
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
