/**
 * Badge management for extension icon
 */

import { StorageData } from './types.js';

/**
 * Determine badge state for a specific window
 *
 * @param windowId - The window ID to check
 * @param enabled - Whether auto-switching is enabled
 * @param paused - Whether switching is temporarily paused
 * @param windowMode - Window mode setting ('global' or 'current-window')
 * @param selectedWindowId - The selected window ID (for current-window mode)
 * @returns Badge text and color
 */
function getBadgeForWindow(
  windowId: number,
  enabled: boolean,
  paused: boolean,
  windowMode: 'global' | 'current-window',
  selectedWindowId?: number
): { text: string; color: string } {
  // In current-window mode, only show active state for the selected window
  if (windowMode === 'current-window') {
    if (windowId !== selectedWindowId) {
      // Other windows show OFF
      return { text: 'OFF', color: '#9E9E9E' }; // Gray
    }
  }

  // Determine badge state based on enabled/paused status
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
 * - OFF (gray): Extension is disabled or current window is not the selected window
 * - ⏸ (orange): Currently paused due to user activity
 * - ON (green): Active and switching tabs
 *
 * In current-window mode, the badge only shows ON/paused for the selected window.
 * All other windows show OFF.
 *
 * @param enabled - Whether auto-switching is enabled
 * @param paused - Whether switching is temporarily paused
 * @param tabId - Optional specific tab ID to update (if not provided, updates all tabs)
 */
export async function updateBadge(enabled: boolean, paused: boolean = false, tabId?: number): Promise<void> {
  try {
    // Get window mode settings
    const data = await chrome.storage.local.get(['windowMode', 'selectedWindowId']) as StorageData;
    const windowMode = data.windowMode ?? 'global';
    const selectedWindowId = data.selectedWindowId;

    // If specific tab requested, update only that tab
    if (tabId !== undefined) {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId) {
        const badge = getBadgeForWindow(tab.windowId, enabled, paused, windowMode, selectedWindowId);
        await chrome.action.setBadgeText({ tabId, text: badge.text });
        await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
      }
      return;
    }

    // Update all tabs in all windows
    const windows = await chrome.windows.getAll({ populate: true });

    for (const window of windows) {
      if (!window.id || !window.tabs) continue;

      const badge = getBadgeForWindow(window.id, enabled, paused, windowMode, selectedWindowId);

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
