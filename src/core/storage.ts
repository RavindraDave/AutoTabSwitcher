/**
 * Storage management helpers
 */

import { StorageData } from './types';
import {
  DEFAULT_ENABLED,
  DEFAULT_WINDOW_MODE,
  DEFAULT_PAUSE_ON_ACTIVITY,
  DEFAULT_PAUSE_DURATION,
} from './constants';

/**
 * Initialize default storage values on extension install
 *
 * @param defaultDelayTime - The default delay time in milliseconds
 */
export async function initializeStorage(defaultDelayTime: number): Promise<void> {
  await chrome.storage.local.set({
    enabled: DEFAULT_ENABLED,
    delayTime: defaultDelayTime,
    windowMode: DEFAULT_WINDOW_MODE,
    selectedWindowId: undefined,
    pauseOnActivity: DEFAULT_PAUSE_ON_ACTIVITY,
    pauseDuration: DEFAULT_PAUSE_DURATION,
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
