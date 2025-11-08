/**
 * Activity tracking for pause-on-activity feature
 */

import { StorageData } from './types.js';
import { DEFAULT_PAUSE_ON_ACTIVITY, DEFAULT_PAUSE_DURATION } from './constants.js';

/**
 * Track last user activity timestamp
 * This is intentionally module-level for performance (avoid storage reads on every activity)
 */
let lastUserActivityTime: number = 0;

/**
 * Check if auto-switching is currently paused due to recent user activity
 *
 * @returns true if paused, false otherwise
 */
export async function isPaused(): Promise<boolean> {
  const data = await chrome.storage.local.get(['pauseOnActivity', 'pauseDuration']) as StorageData;
  const pauseOnActivity = data.pauseOnActivity ?? DEFAULT_PAUSE_ON_ACTIVITY;

  if (!pauseOnActivity) {
    return false; // Feature disabled
  }

  const pauseDuration = data.pauseDuration ?? DEFAULT_PAUSE_DURATION;
  const now = Date.now();
  const timeSinceActivity = now - lastUserActivityTime;

  return timeSinceActivity < pauseDuration;
}

/**
 * Record that user activity has occurred
 * Updates the last activity timestamp
 */
export function recordUserActivity(): void {
  lastUserActivityTime = Date.now();
  console.log('User activity detected, updating timestamp');
}

/**
 * Set up activity detection listeners
 * Monitors user interactions to pause auto-switching when user is active
 */
export function setupActivityListeners(): void {
  /**
   * Detect tab updates (user navigating, reloading, etc.)
   */
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
    // Only count meaningful updates as activity
    if (changeInfo.url || changeInfo.status === 'loading') {
      recordUserActivity();
    }
  });

  /**
   * Detect new tab creation (user opening tabs)
   */
  chrome.tabs.onCreated.addListener(() => {
    recordUserActivity();
  });

  /**
   * Detect tab switching (user manually switching tabs)
   */
  chrome.tabs.onActivated.addListener(() => {
    recordUserActivity();
  });

  /**
   * Detect window focus changes (user switching windows)
   */
  chrome.windows.onFocusChanged.addListener((windowId) => {
    // windowId is -1 when all Chrome windows lose focus
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      recordUserActivity();
    }
  });
}
