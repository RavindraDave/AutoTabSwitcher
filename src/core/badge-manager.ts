/**
 * Badge management for extension icon
 */

import { StorageData } from './types.js';

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
 */
export async function updateBadge(enabled: boolean, paused: boolean = false): Promise<void> {
  let badgeText: string;
  let badgeColor: string;

  // Get window mode settings
  const data = await chrome.storage.local.get(['windowMode', 'selectedWindowId']) as StorageData;
  const windowMode = data.windowMode ?? 'global';
  const selectedWindowId = data.selectedWindowId;

  // In current-window mode, check if we're in the selected window
  if (windowMode === 'current-window' && enabled) {
    try {
      // Get the currently focused window
      const currentWindow = await chrome.windows.getLastFocused();

      // If we're not in the selected window, show OFF badge
      if (currentWindow.id !== selectedWindowId) {
        badgeText = 'OFF';
        badgeColor = '#9E9E9E'; // Gray
        await chrome.action.setBadgeText({ text: badgeText });
        await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
        return;
      }

      // Verify the selected window still exists
      if (selectedWindowId) {
        await chrome.windows.get(selectedWindowId);
      }
    } catch (error) {
      // If selected window doesn't exist or there's an error, show OFF
      badgeText = 'OFF';
      badgeColor = '#9E9E9E'; // Gray
      await chrome.action.setBadgeText({ text: badgeText });
      await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      return;
    }
  }

  // Determine badge state based on enabled/paused status
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
