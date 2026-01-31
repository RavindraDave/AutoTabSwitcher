/**
 * Delay Calculator - Determines effective delay with precedence rules
 *
 * Precedence Order:
 * 1. Group Custom Delay (highest priority)
 * 2. Window Custom Delay
 * 3. Global Delay (lowest priority)
 */

import { logger } from './logger.js';
import { canAccessPremium } from './premium-access.js';
import { PREMIUM_FEATURES_AVAILABLE } from './build-config.js';

// Premium manager imports
let groupManager: any = null;

if (PREMIUM_FEATURES_AVAILABLE) {
  import('../premium/GroupManager.js').then(module => {
    groupManager = module.groupManager;
  }).catch(() => {
    logger.warn('DelayCalculator', 'GroupManager not available');
  });
}

/**
 * Calculate the effective delay for tab switching
 *
 * Precedence:
 * 1. If premium + active group has customDelayTime → use group delay
 * 2. Else if window mode + window has customDelayTime → use window delay
 * 3. Else → use global delay
 *
 * @param globalDelay - Global delay time in milliseconds
 * @param windowId - Optional window ID for window-specific delay
 * @param windowStates - Optional window states map
 * @returns Effective delay in milliseconds
 */
export async function getEffectiveDelay(
  globalDelay: number,
  windowId?: number,
  windowStates?: { [windowId: number]: { enabled: boolean; customDelayTime?: number } }
): Promise<{ delay: number; source: 'group' | 'window' | 'global' }> {
  // Check for premium group custom delay (highest priority)
  if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && groupManager) {
    try {
      const activeGroupId = await groupManager.getActiveGroupId();
      if (activeGroupId) {
        const activeGroup = await groupManager.getGroup(activeGroupId);
        if (activeGroup && activeGroup.settings?.customDelayTime) {
          const groupDelay = activeGroup.settings.customDelayTime;
          await logger.debug('DelayCalculator', 'Using group custom delay', {
            groupId: activeGroupId,
            groupName: activeGroup.name,
            delay: groupDelay
          });
          return { delay: groupDelay, source: 'group' };
        }
      }
    } catch (error) {
      await logger.error('DelayCalculator', 'Error checking group delay', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fall through to window/global delay
    }
  }

  // Check for window custom delay (medium priority)
  if (windowId !== undefined && windowStates && windowStates[windowId]?.customDelayTime) {
    const windowDelay = windowStates[windowId].customDelayTime!;
    await logger.debug('DelayCalculator', 'Using window custom delay', {
      windowId,
      delay: windowDelay
    });
    return { delay: windowDelay, source: 'window' };
  }

  // Use global delay (lowest priority)
  await logger.debug('DelayCalculator', 'Using global delay', {
    delay: globalDelay
  });
  return { delay: globalDelay, source: 'global' };
}

/**
 * Get the current effective delay for a window
 * Simplified version that reads from storage
 *
 * @param windowId - Window ID (optional, for window mode)
 * @returns Effective delay in milliseconds
 */
export async function getCurrentEffectiveDelay(windowId?: number): Promise<number> {
  try {
    const data = await chrome.storage.local.get(['delayTime', 'windowStates']);
    const globalDelay = data['delayTime'] ?? 5000; // Default 5 seconds
    const windowStates = data['windowStates'] || {};

    const result = await getEffectiveDelay(globalDelay, windowId, windowStates);
    return result.delay;
  } catch (error) {
    await logger.error('DelayCalculator', 'Error getting effective delay', {
      error: error instanceof Error ? error.message : String(error)
    });
    return 5000; // Fallback to 5 seconds
  }
}
