/**
 * Switch Notification System
 *
 * Provides visual feedback when a tab switch occurs:
 * - Updates the badge text briefly to show ">>>" indicator
 * - Flashes the badge color to indicate a switch happened
 *
 * Uses badge-based notifications (no chrome.notifications permission needed)
 * to keep the extension lightweight and non-intrusive.
 */

import { logger } from './logger.js';
import { getSwitchNotification } from './storage.js';
import { NOTIFICATION_DISPLAY_MS } from './constants.js';
import { updateBadge } from './badge-manager.js';

/**
 * Timeout handle for restoring badge after notification.
 */
let notificationTimeout: number | undefined;

/**
 * Show a brief visual notification that a tab switch occurred.
 * Uses the extension badge to flash a switch indicator.
 *
 * @param fromTabTitle - Title of the tab being switched from
 * @param toTabTitle - Title of the tab being switched to
 * @param windowId - Window where the switch occurred
 */
export async function notifyTabSwitch(
  _fromTabTitle: string,
  _toTabTitle: string,
  windowId?: number
): Promise<void> {
  try {
    const enabled = await getSwitchNotification();
    if (!enabled) {
      return;
    }

    // Clear any existing notification timeout
    if (notificationTimeout !== undefined) {
      clearTimeout(notificationTimeout);
    }

    // Flash the badge to show a switch indicator
    await chrome.action.setBadgeText({ text: '>>' });
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green flash

    // Restore the normal badge after the display period
    notificationTimeout = setTimeout(async () => {
      try {
        // Restore normal badge state
        await updateBadge(true, false);
      } catch (error) {
        // Silently handle - badge restore is non-critical
      }
      notificationTimeout = undefined;
    }, NOTIFICATION_DISPLAY_MS) as unknown as number;

    await logger.debug('SwitchNotifier', 'Tab switch notification shown', {
      windowId,
    });
  } catch (error) {
    await logger.error('SwitchNotifier', 'Failed to show switch notification', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clean up notification resources.
 */
export function cleanupNotifier(): void {
  if (notificationTimeout !== undefined) {
    clearTimeout(notificationTimeout);
    notificationTimeout = undefined;
  }
}
