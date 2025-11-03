/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

// Constants
const ALARM_NAME = 'tabSwitcher';
// Chrome alarms API minimum period is 1 minute for unpacked extensions
// See: https://developer.chrome.com/docs/extensions/reference/alarms/
const MIN_DELAY_MS = 60000; // 60 seconds (1 minute) - Chrome's minimum
const DEFAULT_DELAY_TIME = MIN_DELAY_MS; // Use minimum as default
const DEFAULT_ENABLED = false;
const DEFAULT_WINDOW_MODE = 'global'; // 'global' or 'current-window'
const DEFAULT_PAUSE_ON_ACTIVITY = false; // Pause when user is active
const DEFAULT_PAUSE_DURATION = 30000; // 30 seconds pause after user activity

// Track last user activity timestamp
let lastUserActivityTime: number = 0;

// Types for storage data
interface StorageData {
  delayTime?: number;
  enabled?: boolean;
  windowMode?: 'global' | 'current-window';
  selectedWindowId?: number;
  pauseOnActivity?: boolean;
  pauseDuration?: number; // in milliseconds
}

/**
 * Check if auto-switching is currently paused due to user activity
 */
async function isPaused(): Promise<boolean> {
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
 * Update the extension badge text based on enabled and paused status
 */
async function updateBadge(enabled: boolean, paused: boolean = false): Promise<void> {
  let badgeText: string;
  let badgeColor: string;

  if (!enabled) {
    badgeText = 'OFF';
    badgeColor = '#9E9E9E'; // Gray
  } else if (paused) {
    badgeText = '⏸'; // Pause symbol
    badgeColor = '#FF9800'; // Orange
  } else {
    badgeText = 'ON';
    badgeColor = '#4CAF50'; // Green
  }

  await chrome.action.setBadgeText({ text: badgeText });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

/**
 * Switch to the next tab based on window mode configuration
 */
async function switchTab(): Promise<void> {
  try {
    // Get settings to determine which window(s) to switch
    const data = await chrome.storage.local.get(['windowMode', 'selectedWindowId']) as StorageData;
    const windowMode = data.windowMode ?? DEFAULT_WINDOW_MODE;
    const selectedWindowId = data.selectedWindowId;

    let targetWindowId: number | undefined;

    if (windowMode === 'current-window') {
      // Use the specific selected window
      if (!selectedWindowId) {
        console.warn('Current-window mode but no window selected');
        return;
      }

      // Verify the window still exists
      try {
        await chrome.windows.get(selectedWindowId);
        targetWindowId = selectedWindowId;
      } catch (error) {
        console.warn('Selected window no longer exists, disabling auto-switching');
        await chrome.storage.local.set({ enabled: false });
        await updateBadge(false);
        return;
      }
    } else {
      // Global mode: switch in the currently focused window
      const currentWindow = await chrome.windows.getCurrent();
      targetWindowId = currentWindow.id;
    }

    // Query tabs in the target window
    const tabs = await chrome.tabs.query({ windowId: targetWindowId });

    if (tabs.length <= 1) {
      return; // Nothing to switch if only one tab
    }

    const currentTab = tabs.find((tab) => tab.active);

    if (!currentTab || currentTab.index === undefined) {
      console.warn('No active tab found in target window');
      return;
    }

    const currentTabIndex = currentTab.index;
    const nextTabIndex = (currentTabIndex + 1) % tabs.length;
    const nextTab = tabs[nextTabIndex];

    if (nextTab && nextTab.id) {
      await chrome.tabs.update(nextTab.id, { active: true });
      console.log(`Switched to next tab in window ${targetWindowId} (mode: ${windowMode})`);
    }
  } catch (error) {
    console.error('Error switching tabs:', error);
  }
}

/**
 * Start or stop the tab switcher alarm based on current settings
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Always clear existing alarm first
    await chrome.alarms.clear(ALARM_NAME);

    // Get current settings from storage
    const data = await chrome.storage.local.get(['enabled', 'delayTime']) as StorageData;
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;

    if (enabled) {
      // Clamp delay to Chrome's minimum (1 minute for unpacked extensions)
      const clampedDelayMs = Math.max(delayTime, MIN_DELAY_MS);
      const periodInMinutes = clampedDelayMs / 60000;

      await chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: periodInMinutes,
        periodInMinutes: periodInMinutes,
      });

      console.log(`Tab switcher started with ${clampedDelayMs}ms delay (requested: ${delayTime}ms)`);
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
    const data = await chrome.storage.local.get(['enabled']) as StorageData;
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
    // Set defaults only on fresh install
    await chrome.storage.local.set({
      enabled: DEFAULT_ENABLED,
      delayTime: DEFAULT_DELAY_TIME,
      windowMode: DEFAULT_WINDOW_MODE,
      selectedWindowId: undefined,
      pauseOnActivity: DEFAULT_PAUSE_ON_ACTIVITY,
      pauseDuration: DEFAULT_PAUSE_DURATION,
    });
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
    // Check if switcher should be running
    const data = await chrome.storage.local.get(['enabled']) as StorageData;
    if (data.enabled) {
      console.log('New window created, ensuring switcher is active');
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in window creation handler:', error);
  }
});

/**
 * Activity Detection Listeners
 * These listeners track user activity to pause auto-switching when user is working
 */

/**
 * Update last activity time
 */
function recordUserActivity(): void {
  lastUserActivityTime = Date.now();
  console.log('User activity detected, updating timestamp');
}

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

// Initialize on script load (when service worker starts)
toggleTabSwitcher();
