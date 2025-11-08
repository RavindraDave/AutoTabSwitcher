/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

import { isPacked } from './utils/environment.js';
import { MIN_DELAY_MS_DEVELOPMENT, MIN_DELAY_MS_PRODUCTION, DEFAULT_ENABLED } from './core/constants.js';
import { initializeStorage, getSettings } from './core/storage.js';
import { setupActivityListeners } from './core/activity-tracker.js';
import { toggleHybridTimer, setupAlarmListener } from './core/timing-hybrid.js';

// Determine minimum delay based on environment
const MIN_DELAY_MS = isPacked() ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
const DEFAULT_DELAY_TIME = MIN_DELAY_MS;

/**
 * Start or stop the tab switcher using hybrid timing mechanism
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Get current settings from storage
    const data = await getSettings(['enabled', 'delayTime']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;

    // Delegate to hybrid timer implementation
    await toggleHybridTimer(enabled, delayTime, MIN_DELAY_MS);
  } catch (error) {
    console.error('Error toggling tab switcher:', error);
  }
}

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

// Set up alarm listener (for hybrid timing)
setupAlarmListener();

// Set up activity detection listeners
setupActivityListeners();

// Initialize on script load (when service worker starts)
toggleTabSwitcher();
