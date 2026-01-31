/**
 * Core tab switching logic
 */

import { StorageData } from './types.js';
import { DEFAULT_WINDOW_MODE } from './constants.js';
import { getSwitchingMode } from './storage.js';
import { updateBadge } from './badge-manager.js';
import { logger, logTabSwitch } from './logger.js';
import { canAccessPremium } from './premium-access.js';
import { PREMIUM_FEATURES_AVAILABLE } from './build-config.js';

// Premium feature managers (only imported if premium features are enabled at build time)
let skipRuleEngine: any = null;
let refreshManager: any = null;
let rotationEngine: any = null;
let groupManager: any = null;

// Dynamically import premium managers if available
if (PREMIUM_FEATURES_AVAILABLE) {
  import('../premium/SkipRuleEngine.js').then(module => {
    skipRuleEngine = module.skipRuleEngine;
  }).catch(() => {
    logger.warn('Premium', 'SkipRuleEngine not available');
  });

  import('../premium/RefreshManager.js').then(module => {
    refreshManager = module.refreshManager;
  }).catch(() => {
    logger.warn('Premium', 'RefreshManager not available');
  });

  import('../premium/RotationEngine.js').then(module => {
    rotationEngine = module.rotationEngine;
  }).catch(() => {
    logger.warn('Premium', 'RotationEngine not available');
  });

  import('../premium/GroupManager.js').then(module => {
    groupManager = module.groupManager;
  }).catch(() => {
    logger.warn('Premium', 'GroupManager not available');
  });
}

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
        await logger.error('TabSwitcher', 'BUG: Window mode without specificWindowId - timing-hybrid.ts used instead of WindowTimerManager', {
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
          await logger.warn('TabSwitcher', 'Current-window mode but no window selected', {});
          return false;
        }

        // Verify the window still exists
        try {
          await chrome.windows.get(selectedWindowId);
          targetWindowId = selectedWindowId;
        } catch (error) {
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
    let tabs = await chrome.tabs.query({ windowId: targetWindowId });

    // Premium: Apply skip rules to filter tabs
    if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && skipRuleEngine) {
      try {
        const filteredTabs = await skipRuleEngine.filterTabs(tabs);
        if (filteredTabs.length > 0) {
          tabs = filteredTabs;
          await logger.info('Premium', 'Skip rules applied', {
            originalCount: tabs.length,
            filteredCount: filteredTabs.length
          });
        }
      } catch (error) {
        await logger.error('Premium', 'Error applying skip rules, using all tabs', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Premium: Apply group filtering if active group exists
    let activeGroupId: string | null = null;
    let activeGroup: any = null;
    if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && groupManager) {
      try {
        activeGroupId = await groupManager.getActiveGroupId();
        if (activeGroupId) {
          activeGroup = await groupManager.getGroup(activeGroupId);
          if (activeGroup && activeGroup.settings.enabled) {
            // Filter tabs based on group rotation mode
            const groupTabs = await groupManager.filterTabsByGroupMode(
              tabs,
              activeGroupId,
              activeGroup.rotationMode || 'within'
            );

            if (groupTabs.length > 0) {
              tabs = groupTabs;
              await logger.info('Premium', 'Group filtering applied', {
                groupId: activeGroupId,
                groupName: activeGroup.name,
                rotationMode: activeGroup.rotationMode,
                originalCount: tabs.length,
                filteredCount: groupTabs.length
              });
            }
          }
        }
      } catch (error) {
        await logger.error('Premium', 'Error applying group filtering, using all tabs', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (tabs.length <= 1) {
      return false; // Nothing to switch if only one tab
    }

    const currentTab = tabs.find((tab) => tab.active);

    if (!currentTab || currentTab.index === undefined) {
      await logger.warn('TabSwitcher', 'No active tab found in target window', {
        targetWindowId
      });
      return false;
    }

    // Determine next tab using rotation pattern (if premium) or sequential
    let nextTabIndex: number;

    if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && rotationEngine && currentTab.id) {
      try {
        // Get active rotation pattern (group-specific or global)
        let activePattern: string;

        if (activeGroup && activeGroup.settings.rotationPatternId) {
          // Use group's custom rotation pattern
          activePattern = activeGroup.settings.rotationPatternId;
          await logger.debug('TabSwitcher', 'Using group rotation pattern', {
            groupId: activeGroupId,
            pattern: activePattern
          });
        } else {
          // Use global rotation pattern
          const result = await chrome.storage.local.get('activePattern');
          activePattern = result['activePattern'] || 'sequential';
        }

        // Use RotationEngine to get next tab index
        nextTabIndex = await rotationEngine.getNextTabIndex(tabs, currentTab.id, activePattern);

        if (nextTabIndex === -1) {
          // Fall back to sequential if pattern resolution fails
          await logger.warn('TabSwitcher', 'Pattern resolution failed, using sequential', {
            pattern: activePattern
          });
          nextTabIndex = (currentTab.index + 1) % tabs.length;
        }

        await logger.debug('TabSwitcher', 'Using rotation pattern', {
          pattern: activePattern,
          currentIndex: currentTab.index,
          nextIndex: nextTabIndex
        });
      } catch (error) {
        // Fall back to sequential on error
        await logger.error('TabSwitcher', 'Error applying rotation pattern', {
          error: error instanceof Error ? error.message : String(error)
        });
        nextTabIndex = (currentTab.index + 1) % tabs.length;
      }
    } else {
      // Default sequential rotation
      nextTabIndex = (currentTab.index + 1) % tabs.length;
    }

    const nextTab = tabs[nextTabIndex];

    if (nextTab && nextTab.id && targetWindowId !== undefined) {
      // Get tab information before switching
      const previousTabTitle = currentTab?.title || 'Unknown';
      const newTabTitle = nextTab.title || 'Unknown';
      const previousTabId = currentTab?.id;

      // Premium: Preemptive refresh before switching
      if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && refreshManager) {
        try {
          const shouldRefresh = await refreshManager.shouldRefresh(nextTab.id);
          if (shouldRefresh) {
            await refreshManager.preemptiveRefresh(nextTab.id);
            await logger.info('Premium', 'Preemptive refresh completed', {
              tabId: nextTab.id,
              title: newTabTitle
            });
          }
        } catch (error) {
          await logger.error('Premium', 'Error in preemptive refresh', {
            error: error instanceof Error ? error.message : String(error),
            tabId: nextTab.id
          });
        }
      }

      await chrome.tabs.update(nextTab.id, { active: true });

      // Premium: Post-switch refresh after switching
      if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium() && refreshManager) {
        try {
          await refreshManager.postSwitchRefresh(nextTab.id);
          await logger.info('Premium', 'Post-switch refresh completed', {
            tabId: nextTab.id,
            title: newTabTitle
          });
        } catch (error) {
          await logger.error('Premium', 'Error in post-switch refresh', {
            error: error instanceof Error ? error.message : String(error),
            tabId: nextTab.id
          });
        }
      }

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
    await logger.error('TabSwitcher', 'Error switching tabs', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
