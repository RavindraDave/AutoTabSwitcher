/**
 * Delay Calculator - Determines effective delay with precedence rules
 *
 * Precedence Order:
 * 1. Per-Tab Custom Delay (highest priority) — Phase 1.1, free feature
 * 2. Group Custom Delay (premium)
 * 3. Window Custom Delay
 * 4. Global Delay (lowest priority)
 */

import { logger } from './logger.js';
import { canAccessPremium } from './premium-access.js';
import { PREMIUM_FEATURES_AVAILABLE } from './build-config.js';
import { getTabDelayForUrl } from './storage.js';

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
 * 1. If tabUrl has a per-tab delay → use per-tab delay (Phase 1.1)
 * 2. If premium + active group has customDelayTime → use group delay
 * 3. Else if window has customDelayTime → use window delay
 * 4. Else → use global delay
 *
 * @param globalDelay - Global delay time in milliseconds
 * @param windowId - Optional window ID for window-specific delay
 * @param windowStates - Optional window states map
 * @param tabUrl - Optional URL of the currently-active tab for per-tab delay lookup
 * @returns Effective delay in milliseconds with source label
 */
export async function getEffectiveDelay(
  globalDelay: number,
  windowId?: number,
  windowStates?: { [windowId: number]: { enabled: boolean; customDelayTime?: number } },
  tabUrl?: string | null
): Promise<{ delay: number; source: 'tab' | 'group' | 'window' | 'global' }> {
  // Check for per-tab delay (highest priority)
  if (tabUrl) {
    try {
      const perTabDelay = await getTabDelayForUrl(tabUrl);
      if (perTabDelay !== null) {
        await logger.debug('DelayCalculator', 'Using per-tab delay', {
          tabUrl,
          delay: perTabDelay
        });
        return { delay: perTabDelay, source: 'tab' };
      }
    } catch (error) {
      await logger.error('DelayCalculator', 'Error checking per-tab delay', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fall through to other sources
    }
  }

  // Check for premium group custom delay
  if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && groupManager) {
    try {
      const activeGroupId = await groupManager.getActiveGroupId();
      if (activeGroupId) {
        const activeGroup = await groupManager.getGroup(activeGroupId);
        if (activeGroup && activeGroup.settings?.customDelayTime !== undefined) {
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
  if (windowId !== undefined && windowStates && windowStates[windowId]?.customDelayTime !== undefined) {
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
 * @param tabUrl - Optional URL of the active tab for per-tab delay lookup
 * @returns Effective delay in milliseconds
 */
export async function getCurrentEffectiveDelay(
  windowId?: number,
  tabUrl?: string | null
): Promise<number> {
  try {
    const data = await chrome.storage.local.get(['delayTime', 'windowStates']);
    const globalDelay = data['delayTime'] ?? 5000; // Default 5 seconds
    const windowStates = data['windowStates'] || {};

    const result = await getEffectiveDelay(globalDelay, windowId, windowStates, tabUrl);
    return result.delay;
  } catch (error) {
    await logger.error('DelayCalculator', 'Error getting effective delay', {
      error: error instanceof Error ? error.message : String(error)
    });
    return 5000; // Fallback to 5 seconds
  }
}
