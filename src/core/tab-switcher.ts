/**
 * Core tab switching logic
 */

import { StorageData } from './types.js';
import { DEFAULT_WINDOW_MODE } from './constants.js';
import { updateBadge } from './badge-manager.js';
import { logger, logTabSwitch } from './logger.js';

/**
 * Switch to the next tab based on window mode configuration
 *
 * Window modes:
 * - 'global': Switches tabs in the currently focused window
 * - 'current-window': Switches tabs only in the pre-selected window
 *
 * If the selected window no longer exists, disables auto-switching.
 *
 * @param specificWindowId - Optional. If provided, switches tabs in this specific window (for Window Mode)
 * @returns true if tab switch succeeded, false if it failed or was skipped
 */
export async function switchTab(specificWindowId?: number): Promise<boolean> {
  try {
    let targetWindowId: number | undefined;
    let windowMode: string | undefined;

    // NEW: If a specific window ID is provided (Window Mode), use it directly
    if (specificWindowId !== undefined) {
      // Verify the window still exists
      try {
        await chrome.windows.get(specificWindowId);
        targetWindowId = specificWindowId;
        windowMode = 'window'; // Mark as Window Mode
      } catch (error) {
        console.warn(`Window ${specificWindowId} no longer exists, cannot switch tabs`);
        await logger.warn('TabSwitcher', 'Specified window no longer exists', {
          windowId: specificWindowId,
        });
        return false;
      }
    } else {
      // EXISTING BEHAVIOR: Use legacy windowMode logic
      const data = await chrome.storage.local.get(['windowMode', 'selectedWindowId']) as StorageData;
      windowMode = data.windowMode ?? DEFAULT_WINDOW_MODE;
      const selectedWindowId = data.selectedWindowId;

      if (windowMode === 'current-window') {
        // Use the specific selected window
        if (!selectedWindowId) {
          console.warn('Current-window mode but no window selected');
          return false;
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
          return false;
        }
      } else {
        // Global mode: switch in the currently focused window
        const currentWindow = await chrome.windows.getCurrent();
        targetWindowId = currentWindow.id;
      }
    }

    // Query tabs in the target window
    const tabs = await chrome.tabs.query({ windowId: targetWindowId });

    if (tabs.length <= 1) {
      return false; // Nothing to switch if only one tab
    }

    const currentTab = tabs.find((tab) => tab.active);

    if (!currentTab || currentTab.index === undefined) {
      console.warn('No active tab found in target window');
      return false;
    }

    const currentTabIndex = currentTab.index;
    const nextTabIndex = (currentTabIndex + 1) % tabs.length;
    const nextTab = tabs[nextTabIndex];

    if (nextTab && nextTab.id && targetWindowId !== undefined) {
      // Get tab information before switching
      const previousTabTitle = currentTab?.title || 'Unknown';
      const newTabTitle = nextTab.title || 'Unknown';
      const previousTabId = currentTab?.id;

      await chrome.tabs.update(nextTab.id, { active: true });
      console.log(`Switched to next tab in window ${targetWindowId} (mode: ${windowMode})`);

      // Store the timestamp of this switch per window
      const now = Date.now();
      const data = await chrome.storage.local.get(['lastSwitchTimes', 'windowStates', 'operatingMode']) as StorageData;
      const lastSwitchTimes = data.lastSwitchTimes || {};
      lastSwitchTimes[targetWindowId] = now;

      // BUGFIX: Also update windowStates.lastSwitchTime for Window Mode
      // This ensures the popup timer works correctly in Window Mode
      const operatingMode = data.operatingMode;
      if (operatingMode === 'window' && data.windowStates?.[targetWindowId]) {
        const windowStates = { ...data.windowStates };
        const currentState = windowStates[targetWindowId];
        if (currentState) {
          windowStates[targetWindowId] = {
            enabled: currentState.enabled,
            enabledTimestamp: currentState.enabledTimestamp,
            lastSwitchTime: now
          };
          await chrome.storage.local.set({ lastSwitchTimes, windowStates });
        } else {
          await chrome.storage.local.set({ lastSwitchTimes });
        }
      } else {
        await chrome.storage.local.set({ lastSwitchTimes });
      }

      // Enhanced logging with tab information
      await logTabSwitch({
        windowId: targetWindowId,
        mode: windowMode === 'global' ? 'global' : 'window',
        previousTabId,
        newTabId: nextTab.id,
        previousTabTitle,
        newTabTitle,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error switching tabs:', error);
    await logger.error('TabSwitcher', 'Error switching tabs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
