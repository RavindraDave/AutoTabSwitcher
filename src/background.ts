/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

// Constants
const ALARM_NAME = 'tabSwitcher';
const DEFAULT_DELAY_TIME = 10000; // 10 seconds
const DEFAULT_ENABLED = false;

// Types for storage data
interface StorageData {
  delayTime?: number;
  enabled?: boolean;
}

/**
 * Update the extension badge text based on enabled status
 */
async function updateBadge(enabled: boolean): Promise<void> {
  const badgeText = enabled ? 'ON' : 'OFF';
  await chrome.action.setBadgeText({ text: badgeText });

  // Set badge color for better visibility
  const badgeColor = enabled ? '#4CAF50' : '#9E9E9E'; // Green : Gray
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

/**
 * Switch to the next tab in the current window
 */
async function switchTab(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    if (tabs.length <= 1) {
      return; // Nothing to switch if only one tab
    }

    const currentTab = tabs.find((tab) => tab.active);

    if (!currentTab || currentTab.index === undefined) {
      console.warn('No active tab found');
      return;
    }

    const currentTabIndex = currentTab.index;
    const nextTabIndex = (currentTabIndex + 1) % tabs.length;
    const nextTab = tabs[nextTabIndex];

    if (nextTab && nextTab.id) {
      await chrome.tabs.update(nextTab.id, { active: true });
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
      // Create alarm with the specified delay (in minutes for chrome.alarms)
      const periodInMinutes = delayTime / 60000;

      await chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: periodInMinutes,
        periodInMinutes: periodInMinutes,
      });

      console.log(`Tab switcher started with ${delayTime}ms delay`);
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
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    switchTab();
  }
});

/**
 * Handle storage changes - restart alarm if settings changed
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') {
    return;
  }

  const relevantChanges = 'enabled' in changes || 'delayTime' in changes;

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

// Initialize on script load (when service worker starts)
toggleTabSwitcher();
