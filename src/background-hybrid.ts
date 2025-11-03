/**
 * Auto Tab Switcher - Background Service Worker (Hybrid Implementation)
 *
 * This version supports sub-30-second delays using a hybrid approach:
 * - Delays >= 30s: Use chrome.alarms API (most efficient)
 * - Delays < 30s: Use setInterval in service worker (may be interrupted)
 *
 * For production use, replace background.ts with this file and rename to background.ts
 */

// Constants
const ALARM_NAME = 'tabSwitcher';
const MIN_ALARM_DELAY_MS = 30000; // Chrome alarms API minimum for packed extensions

// Environment detection
const isPacked = (): boolean => {
  // Unpacked extensions don't have update_url in manifest
  return !chrome.runtime.getManifest().update_url;
};

// Minimum delays based on environment
const MIN_DELAY_MS_DEVELOPMENT = 60000; // 60 seconds for unpacked (development)
const MIN_DELAY_MS_PRODUCTION = 5000;   // 5 seconds for packed (Chrome Web Store)
const MIN_DELAY_MS = isPacked() ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
const DEFAULT_DELAY_TIME = MIN_DELAY_MS;
const DEFAULT_ENABLED = false;
const DEFAULT_WINDOW_MODE = 'global'; // 'global' or 'current-window'
const DEFAULT_PAUSE_ON_ACTIVITY = false; // Pause when user is active
const DEFAULT_PAUSE_DURATION = 30000; // 30 seconds pause after user activity

// Timer state (for setInterval approach)
let intervalTimerId: number | undefined;

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
 * Start timer using setInterval (for sub-30-second delays)
 * Note: Service worker may be terminated, interrupting the timer
 */
function startIntervalTimer(delayMs: number): void {
  // Clear any existing interval
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
  }

  // Start new interval with pause checking
  intervalTimerId = setInterval(async () => {
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
  }, delayMs) as unknown as number;

  console.log(`Interval timer started with ${delayMs}ms delay`);
}

/**
 * Stop interval timer
 */
function stopIntervalTimer(): void {
  if (intervalTimerId !== undefined) {
    clearInterval(intervalTimerId);
    intervalTimerId = undefined;
    console.log('Interval timer stopped');
  }
}

/**
 * Start timer using chrome.alarms (for >= 30-second delays)
 */
async function startAlarmTimer(delayMs: number): Promise<void> {
  // Clear existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  const periodInMinutes = delayMs / 60000;

  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes: periodInMinutes,
  });

  console.log(`Alarm timer started with ${delayMs}ms delay`);
}

/**
 * Stop alarm timer
 */
async function stopAlarmTimer(): Promise<void> {
  await chrome.alarms.clear(ALARM_NAME);
  console.log('Alarm timer stopped');
}

/**
 * Start or stop the tab switcher using appropriate timing mechanism
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Get current settings from storage
    const data = await chrome.storage.local.get(['enabled', 'delayTime']) as StorageData;
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;

    // Stop all timers first
    stopIntervalTimer();
    await stopAlarmTimer();

    if (enabled) {
      // Clamp delay to minimum
      const clampedDelayMs = Math.max(delayTime, MIN_DELAY_MS);

      // Choose timing mechanism based on delay duration
      if (clampedDelayMs >= MIN_ALARM_DELAY_MS) {
        // Use chrome.alarms for longer delays (more efficient)
        await startAlarmTimer(clampedDelayMs);
      } else {
        // Use setInterval for sub-30-second delays
        // Warning: May be interrupted if service worker terminates
        startIntervalTimer(clampedDelayMs);
      }

      console.log(
        `Tab switcher started: ${clampedDelayMs}ms delay (requested: ${delayTime}ms), ` +
        `using ${clampedDelayMs >= MIN_ALARM_DELAY_MS ? 'alarms' : 'interval'}`
      );
    } else {
      console.log('Tab switcher stopped');
    }

    await updateBadge(enabled);
  } catch (error) {
    console.error('Error toggling tab switcher:', error);
  }
}

/**
 * Handle alarm events - this is where the actual tab switching happens for alarms
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

// Log environment info
console.log(
  `Auto Tab Switcher initialized (${isPacked() ? 'PACKED' : 'UNPACKED'} extension)`,
  `Minimum delay: ${MIN_DELAY_MS}ms`
);
