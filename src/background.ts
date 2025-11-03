/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

import { ALARM_NAME, MIN_DELAY_MS_DEVELOPMENT as MIN_DELAY_MS, DEFAULT_ENABLED } from './core/constants';
import { initializeStorage, getSettings } from './core/storage';
import { updateBadge } from './core/badge-manager';
import { switchTab } from './core/tab-switcher';
import { isPaused, setupActivityListeners } from './core/activity-tracker';

const DEFAULT_DELAY_TIME = MIN_DELAY_MS;

/**
 * Start or stop the tab switcher alarm based on current settings
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Get current settings from storage
    const data = await getSettings(['enabled', 'delayTime']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;

    // Clear any existing alarm first
    await chrome.alarms.clear(ALARM_NAME);

    if (enabled) {
      // Clamp delay to minimum value
      const clampedDelayMs = Math.max(delayTime, MIN_DELAY_MS);
      const periodInMinutes = clampedDelayMs / 60000;

      // Create alarm with the configured delay
      await chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: periodInMinutes,
        periodInMinutes: periodInMinutes,
      });

      console.log(`Tab switcher started: ${clampedDelayMs}ms delay (requested: ${delayTime}ms)`);
    } else {
      console.log('Tab switcher stopped');
    }

    await updateBadge(enabled);
  } catch (error) {
    console.error('Error toggling tab switcher:', error);
  }
}

/**
 * Handle alarm events - this is where the actual tab switching happens
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    // Check if switching is paused due to user activity
    const paused = await isPaused();
    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    if (paused) {
      console.log('Auto-switching paused due to recent user activity');
      await updateBadge(enabled, true);
    } else {
      await updateBadge(enabled, false);
      await switchTab();
    }
  }
});

/**
 * Handle storage changes - restart alarm if settings changed
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') {
    return;
  }

  const relevantChanges = 'enabled' in changes || 'delayTime' in changes ||
                          'windowMode' in changes || 'selectedWindowId' in changes;

  if (relevantChanges) {
    console.log('Settings changed, restarting tab switcher');
    toggleTabSwitcher();
  }
});

/**
 * Set default values when extension is first installed
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    await initializeStorage(DEFAULT_DELAY_TIME);
  }

  // Always update badge and restart switcher on install/update
  await toggleTabSwitcher();
});

/**
 * Handle service worker startup - restore state from storage
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Service worker started, restoring state');
  await toggleTabSwitcher();
});

/**
 * Handle new window creation - ensure switcher is running if enabled
 */
chrome.windows.onCreated.addListener(async () => {
  try {
    const data = await getSettings(['enabled']);
    if (data.enabled) {
      console.log('New window created, ensuring switcher is active');
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in window creation handler:', error);
  }
});

// Set up activity detection listeners
setupActivityListeners();

// Initialize on script load (when service worker starts)
toggleTabSwitcher();
