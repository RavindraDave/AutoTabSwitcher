/**
 * Storage management helpers
 */

import { StorageData, SwitchingMode, OperatingMode } from './types.js';
import {
  DEFAULT_ENABLED,
  DEFAULT_ENABLE_ON_STARTUP,
  DEFAULT_WINDOW_MODE,
  DEFAULT_SWITCHING_MODE,
  DEFAULT_OPERATING_MODE,
  DEFAULT_PAUSE_ON_ACTIVITY,
  DEFAULT_PAUSE_DURATION,
  MIN_DELAY_MS_PRODUCTION,
} from './constants.js';
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
    switchingMode: DEFAULT_SWITCHING_MODE, // Primary mode field
    operatingMode: DEFAULT_SWITCHING_MODE, // DEPRECATED: Kept for backward compatibility
    selectedWindowId: undefined,
    pauseOnActivity: DEFAULT_PAUSE_ON_ACTIVITY,
    pauseDuration: DEFAULT_PAUSE_DURATION,
    windowStates: {}, // Initialize empty window states
    lastSwitchTimes: {}, // BUGFIX: Initialize lastSwitchTimes on fresh install
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
