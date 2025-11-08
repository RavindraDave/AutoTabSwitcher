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
import { updateBadge } from './core/badge-manager';

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

/**
 * Handle window focus changes - update badge for current-window mode
 * When user switches between windows, update badge to show correct status
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // windowId is -1 (WINDOW_ID_NONE) when all Chrome windows lose focus
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  try {
    const data = await getSettings(['windowMode']);
    const windowMode = data.windowMode ?? 'global';

    // Only update badge if in current-window mode
    if (windowMode === 'current-window') {
      // Force badge update by re-toggling
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in window focus change handler:', error);
  }
});

/**
 * Handle tab creation - set badge for new tabs
 */
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    if (tab.id === undefined) return;

    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    // Update badge for the newly created tab
    await updateBadge(enabled, false, tab.id);
  } catch (error) {
    console.error('Error in tab creation handler:', error);
  }
});

/**
 * Handle tab updates - ensure badge stays correct when pages reload
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  try {
    // Only update badge when tab is loading or complete (page refresh)
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      const data = await getSettings(['enabled']);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // Update badge for this tab
      await updateBadge(enabled, false, tabId);
    }
  } catch (error) {
    console.error('Error in tab update handler:', error);
  }
});

/**
 * Handle tab being moved between windows - update badge for the moved tab
 */
chrome.tabs.onAttached.addListener(async (tabId, _attachInfo) => {
  try {
    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    // Update badge for the tab in its new window
    await updateBadge(enabled, false, tabId);
  } catch (error) {
    console.error('Error in tab attach handler:', error);
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
