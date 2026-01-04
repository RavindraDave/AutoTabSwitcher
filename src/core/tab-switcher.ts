/**
 * Core tab switching logic
 */

import { StorageData } from './types.js';
import { DEFAULT_WINDOW_MODE } from './constants.js';
import { getSwitchingMode } from './storage.js';
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
      // REFACTORED: Use getSwitchingMode() for backward-compatible mode detection
      const data = await chrome.storage.local.get(['switchingMode', 'operatingMode', 'windowMode', 'selectedWindowId']) as StorageData;
      const switchingMode = getSwitchingMode(data);

      // LEGACY SUPPORT: Check if this is legacy current-window mode
      // (has windowMode='current-window')
      const isLegacyCurrentWindowMode = data.windowMode === 'current-window';

      // Determine window mode from switching mode
      if (switchingMode === 'global') {
        // Global mode: switch in currently focused window
        windowMode = 'global';
      } else if (switchingMode === 'window' && !isLegacyCurrentWindowMode) {
        // BUG: New window mode should always call switchTab(windowId) with a specific ID
        // This path should never execute - indicates a bug in WindowTimerManager or timing-hybrid.ts
        console.error('[BUG] Window mode active but switchTab() called without specificWindowId');
        console.error('      This indicates timing-hybrid.ts is being used instead of WindowTimerManager');
        await logger.error('TabSwitcher', 'Invalid state: Window mode without specificWindowId', {
          switchingMode,
          callStack: new Error().stack
        });
        // Return false instead of falling back - make the bug obvious
        return false;
      } else {
        // Legacy current-window mode OR unknown mode
        windowMode = data.windowMode ?? DEFAULT_WINDOW_MODE;
      }

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
        // BUGFIX: Use getLastFocused() instead of getCurrent() for service worker compatibility
        // getCurrent() doesn't work in Manifest V3 service workers since they don't run in a window context
        const currentWindow = await chrome.windows.getLastFocused();
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
      const data = await chrome.storage.local.get(['lastSwitchTimes', 'windowStates', 'switchingMode', 'operatingMode']) as StorageData;
      const lastSwitchTimes = data.lastSwitchTimes || {};
      lastSwitchTimes[targetWindowId] = now;

      // BUGFIX: Also update windowStates.lastSwitchTime for Window Mode
      // This ensures the popup timer works correctly in Window Mode
      const switchingMode = getSwitchingMode(data);
      if (switchingMode === 'window' && data.windowStates?.[targetWindowId]) {
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
