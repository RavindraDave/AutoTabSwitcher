/**
 * Auto Tab Switcher - Background Service Worker (Hybrid Implementation)
 *
 * This version supports sub-30-second delays using a hybrid approach:
 * - Delays >= 30s: Use chrome.alarms API (most efficient)
 * - Delays < 30s: Use setInterval in service worker (may be interrupted)
 *
 * For production use, replace background.ts with this file and rename to background.ts
 */

import { isPacked } from './utils/environment';
import { MIN_DELAY_MS_DEVELOPMENT, MIN_DELAY_MS_PRODUCTION, DEFAULT_ENABLED } from './core/constants';
import { initializeStorage, getSettings } from './core/storage';
import { setupActivityListeners } from './core/activity-tracker';
import { toggleHybridTimer, setupAlarmListener } from './core/timing-hybrid';

// Determine minimum delay based on environment
const MIN_DELAY_MS = isPacked() ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
const DEFAULT_DELAY_TIME = MIN_DELAY_MS;

/**
 * Start or stop the tab switcher using appropriate timing mechanism
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Get current settings from storage
    const data = await getSettings(['enabled', 'delayTime']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;

    await toggleHybridTimer(enabled, delayTime, MIN_DELAY_MS);
  } catch (error) {
    console.error('Error toggling tab switcher:', error);
  }
}

/**
 * Handle storage changes - restart timer if settings changed
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
 * This is critical for restoring setInterval timers after service worker termination
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Service worker started, restoring state');
  await toggleTabSwitcher();
});

/**
 * Keep service worker alive for interval timers
 * This helps prevent service worker termination when using setInterval
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending');
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

// Set up alarm listener (for >= 30s delays)
setupAlarmListener();

// Set up activity detection listeners
setupActivityListeners();

// Initialize on script load (when service worker starts)
toggleTabSwitcher();

// Log environment info
console.log(
  `Auto Tab Switcher initialized (${isPacked() ? 'PACKED' : 'UNPACKED'} extension)`,
  `Minimum delay: ${MIN_DELAY_MS}ms`
);
