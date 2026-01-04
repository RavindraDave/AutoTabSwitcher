/**
 * Activity tracking for pause-on-activity feature
 */

import { StorageData } from './types.js';
import { DEFAULT_PAUSE_ON_ACTIVITY, DEFAULT_PAUSE_DURATION } from './constants.js';
import { logger } from './logger.js';

/**
 * Track last user activity timestamp
 * SECURITY: Hybrid approach - module variable for performance, storage for service worker resilience
 */
let lastUserActivityTime: number = 0;
let activityInitialized: boolean = false;

/**
 * Initialize activity tracker by loading last activity time from storage
 * SECURITY: Ensures service worker resilience by loading persisted state
 */
async function initializeActivityTracker(): Promise<void> {
  if (!activityInitialized) {
    const data = await chrome.storage.local.get(['lastUserActivityTime']);
    lastUserActivityTime = (data['lastUserActivityTime'] as number) || 0;
    activityInitialized = true;
  }
}

/**
 * Check if auto-switching is currently paused due to recent user activity
 *
 * @returns true if paused, false otherwise
 */
export async function isPaused(): Promise<boolean> {
  // SECURITY: Initialize from storage if needed (service worker wake)
  await initializeActivityTracker();

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
 * Updates the last activity timestamp both in memory and storage
 * SECURITY: Persists to storage for service worker resilience
 */
export function recordUserActivity(): void {
  lastUserActivityTime = Date.now();
  // SECURITY: Persist to storage for service worker resilience
  // Use non-blocking call to avoid performance impact
  chrome.storage.local.set({ lastUserActivityTime }).catch(err => {
    logger.error('ActivityTracker', 'Failed to persist activity time', {
      error: err instanceof Error ? err.message : String(err)
    });
  });
  logger.info('ActivityTracker', 'User activity detected', {
    timestamp: lastUserActivityTime
  });
}

/**
 * Set up activity detection listeners
 * Monitors user interactions to pause auto-switching when user is active
 */
export function setupActivityListeners(): void {
  /**
   * Detect tab updates (user navigating, reloading, etc.)
   */
  chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, _tab) => {
    // Only count meaningful updates as activity
    if (changeInfo.url || changeInfo.status === 'loading') {
      // Only record activity if pause-on-activity is enabled
      const data = await chrome.storage.local.get(['pauseOnActivity']) as StorageData;
      if (data.pauseOnActivity ?? DEFAULT_PAUSE_ON_ACTIVITY) {
        recordUserActivity();
      }
    }
  });

  /**
   * Detect new tab creation (user opening tabs)
   */
  chrome.tabs.onCreated.addListener(async () => {
    // Only record activity if pause-on-activity is enabled
    const data = await chrome.storage.local.get(['pauseOnActivity']) as StorageData;
    if (data.pauseOnActivity ?? DEFAULT_PAUSE_ON_ACTIVITY) {
      recordUserActivity();
    }
  });

  /**
   * Detect tab switching (user manually switching tabs)
   */
  chrome.tabs.onActivated.addListener(async () => {
    // Only record activity if pause-on-activity is enabled
    const data = await chrome.storage.local.get(['pauseOnActivity']) as StorageData;
    if (data.pauseOnActivity ?? DEFAULT_PAUSE_ON_ACTIVITY) {
      recordUserActivity();
    }
  });

  /**
   * Detect window focus changes (user switching windows)
   */
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    // windowId is -1 when all Chrome windows lose focus
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
      // Only record activity if pause-on-activity is enabled
      const data = await chrome.storage.local.get(['pauseOnActivity']) as StorageData;
      if (data.pauseOnActivity ?? DEFAULT_PAUSE_ON_ACTIVITY) {
        recordUserActivity();
      }
    }
  });
}
