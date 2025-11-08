/**
 * Core tab switching logic
 */

import { StorageData } from './types.js';
import { DEFAULT_WINDOW_MODE } from './constants.js';
import { updateBadge } from './badge-manager.js';
import { logger } from './logger.js';

/**
 * Switch to the next tab based on window mode configuration
 *
 * Window modes:
 * - 'global': Switches tabs in the currently focused window
 * - 'current-window': Switches tabs only in the pre-selected window
 *
 * If the selected window no longer exists, disables auto-switching.
 */
export async function switchTab(): Promise<void> {
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
        await logger.warn('TabSwitcher', 'Selected window no longer exists, disabling', {
          selectedWindowId,
        });
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

    if (nextTab && nextTab.id && targetWindowId !== undefined) {
      await chrome.tabs.update(nextTab.id, { active: true });
      console.log(`Switched to next tab in window ${targetWindowId} (mode: ${windowMode})`);

      // Store the timestamp of this switch per window
      const data = await chrome.storage.local.get(['lastSwitchTimes']) as StorageData;
      const lastSwitchTimes = data.lastSwitchTimes || {};
      lastSwitchTimes[targetWindowId] = Date.now();
      await chrome.storage.local.set({ lastSwitchTimes });

      await logger.info('TabSwitcher', 'Tab switched', {
        windowId: targetWindowId,
        windowMode,
        fromTabIndex: currentTabIndex,
        toTabIndex: nextTabIndex,
        totalTabs: tabs.length,
      });
    }
  } catch (error) {
    console.error('Error switching tabs:', error);
    await logger.error('TabSwitcher', 'Error switching tabs', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
