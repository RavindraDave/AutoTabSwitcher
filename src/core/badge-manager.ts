/**
 * Badge management for extension icon
 */

/**
 * Update the extension badge to show current state
 *
 * Badge states:
 * - OFF (gray): Extension is disabled
 * - ⏸ (orange): Currently paused due to user activity
 * - ON (green): Active and switching tabs
 *
 * @param enabled - Whether auto-switching is enabled
 * @param paused - Whether switching is temporarily paused
 */
export async function updateBadge(enabled: boolean, paused: boolean = false): Promise<void> {
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
