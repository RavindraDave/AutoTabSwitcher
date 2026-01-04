/**
 * Badge management for extension icon
 */

import { StorageData } from './types.js';
import { getSwitchingMode } from './storage.js';

/**
 * Determine badge state for a specific window
 *
 * @param windowId - The window ID to check
 * @param enabled - Whether auto-switching is enabled (global mode)
 * @param paused - Whether switching is temporarily paused
 * @param windowMode - Legacy window mode setting ('global' or 'current-window')
 * @param selectedWindowId - The selected window ID (for legacy current-window mode)
 * @param switchingMode - Current switching mode ('global' or 'window')
 * @param windowStates - Per-window enable/disable states (for window mode)
 * @returns Badge text and color
 */
function getBadgeForWindow(
  windowId: number,
  enabled: boolean,
  paused: boolean,
  windowMode: 'global' | 'current-window',
  selectedWindowId?: number,
  switchingMode?: 'global' | 'window',
  windowStates?: { [windowId: number]: { enabled: boolean } }
): { text: string; color: string } {
  // Check switching mode first (takes precedence over legacy windowMode)
  // BUT: Don't use window mode logic for legacy current-window mode
  const isLegacyCurrentWindowMode = windowMode === 'current-window';

  if (switchingMode === 'window' && !isLegacyCurrentWindowMode) {
    // Window Mode: Each window has independent enable/disable state
    const isWindowEnabled = windowStates?.[windowId]?.enabled ?? false;

    if (!isWindowEnabled) {
      return { text: 'OFF', color: '#9E9E9E' }; // Gray
    } else if (paused) {
      return { text: '⏸', color: '#FF9800' }; // Orange - Pause symbol
    } else {
      return { text: 'ON', color: '#4CAF50' }; // Green
    }
  }

  // Legacy current-window mode
  if (windowMode === 'current-window') {
    if (windowId !== selectedWindowId) {
      // Other windows show OFF
      return { text: 'OFF', color: '#9E9E9E' }; // Gray
    }
  }

  // Global mode or legacy mode: use global enabled state
  if (!enabled) {
    return { text: 'OFF', color: '#9E9E9E' }; // Gray
  } else if (paused) {
    return { text: '⏸', color: '#FF9800' }; // Orange - Pause symbol
  } else {
    return { text: 'ON', color: '#4CAF50' }; // Green
  }
}

/**
 * Update the extension badge to show current state
 *
 * Badge states:
 * - OFF (gray): Extension is disabled, window is disabled, or current window is not the selected window
 * - ⏸ (orange): Currently paused due to user activity
 * - ON (green): Active and switching tabs
 *
 * In window mode, each window's badge reflects its individual enabled state.
 * In current-window mode (legacy), the badge only shows ON/paused for the selected window.
 * In global mode, all windows show the same badge state.
 *
 * @param enabled - Whether auto-switching is enabled (used in global mode)
 * @param paused - Whether switching is temporarily paused
 * @param tabId - Optional specific tab ID to update (if not provided, updates all tabs)
 */
export async function updateBadge(enabled: boolean, paused: boolean = false, tabId?: number): Promise<void> {
  try {
    // Get both legacy and new mode settings
    const data = await chrome.storage.local.get([
      'windowMode',
      'selectedWindowId',
      'switchingMode',
      'operatingMode',
      'windowStates'
    ]) as StorageData;

    const windowMode = data.windowMode ?? 'global';
    const selectedWindowId = data.selectedWindowId;
    const switchingMode = getSwitchingMode(data);
    const windowStates = data.windowStates;

    // If specific tab requested, update only that tab
    if (tabId !== undefined) {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        const badge = getBadgeForWindow(
          tab.windowId,
          enabled,
          paused,
          windowMode,
          selectedWindowId,
          switchingMode,
          windowStates
        );
        await chrome.action.setBadgeText({ tabId, text: badge.text });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
      }
      return;
    }

    // Update all tabs in all windows
    const windows = await chrome.windows.getAll({ populate: true });

    for (const window of windows) {
      if (!window.id || !window.tabs) continue;

      const badge = getBadgeForWindow(
        window.id,
        enabled,
        paused,
        windowMode,
        selectedWindowId,
        switchingMode,
        windowStates
      );

      // Update badge for all tabs in this window
      for (const tab of window.tabs) {
        if (tab.id !== undefined) {
          await chrome.action.setBadgeText({ tabId: tab.id, text: badge.text });
          await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: badge.color });
        }
      }
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}
