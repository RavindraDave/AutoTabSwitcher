/**
 * Core tab switching logic
 */

import { StorageData } from './types.js';
import { DEFAULT_WINDOW_MODE } from './constants.js';
import { getSwitchingMode, getTabDelays } from './storage.js';
import { updateBadge } from './badge-manager.js';
import { logger, logTabSwitch } from './logger.js';
import { canAccessPremium } from './premium-access.js';
import { PREMIUM_FEATURES_AVAILABLE } from './build-config.js';
import { recordTabSwitch } from './statistics-tracker.js';
import { notifyTabSwitch } from './switch-notifier.js';
import { getEffectiveDelay } from './delay-calculator.js';
import { rescheduleHybridTimer } from './timing-hybrid.js';
import { windowTimerManager } from './window-timer-manager.js';
import { applyAudioManagementForSwitch } from './audio-manager.js';
import { notifyKioskOverlayOfSwitch } from './kiosk-manager.js';

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
            } else {
              // Group is active but no tabs matched - skip rotation
              await logger.warn('Premium', 'Active group has no matching tabs, skipping rotation', {
                groupId: activeGroupId,
                groupName: activeGroup.name,
                totalTabs: tabs.length
              });
              return false;
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

      // Record statistics for this switch
      await recordTabSwitch(nextTab.id, newTabTitle, tabs.length, previousTabId);

      // Show switch notification (if enabled)
      await notifyTabSwitch(previousTabTitle, newTabTitle, targetWindowId);

      // Phase 1.2: Apply smart audio management (mute inactive tabs)
      // Cheap no-op when the user has the feature disabled.
      try {
        await applyAudioManagementForSwitch(targetWindowId, nextTab.id);
      } catch (error) {
        await logger.error('TabSwitcher', 'Audio management failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Non-fatal: continue with rotation
      }

      // Phase 1.3: Update the kiosk overlay (cheap no-op when disabled).
      try {
        const data = await chrome.storage.local.get('delayTime');
        const approxNextSwitch = (data['delayTime'] as number | undefined) ?? 5000;
        await notifyKioskOverlayOfSwitch(nextTab.id, nextTab.url, newTabTitle, approxNextSwitch);
      } catch (error) {
        await logger.debug('TabSwitcher', 'Kiosk overlay notify failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Phase 1.1: Reschedule the timer if the new tab has a per-tab delay
      // (or if we need to revert from a previous per-tab delay back to the base).
      // This is a no-op for users who haven't configured any per-tab delays.
      try {
        await maybeRescheduleForPerTabDelay(
          nextTab.url,
          targetWindowId,
          windowMode === 'global' ? 'global' : 'window'
        );
      } catch (error) {
        await logger.error('TabSwitcher', 'Error rescheduling for per-tab delay', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Non-fatal: timer continues at previous cadence
      }

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

/**
 * Phase 1.1: After a successful tab switch, decide whether the rotation timer
 * needs to be rescheduled to honor a per-tab custom display time.
 *
 * Optimization: short-circuits to a no-op when the user has no per-tab delays
 * configured at all, so the common case pays only one storage read per switch.
 *
 * Behavior:
 * - If the newly active tab has a per-tab delay → reschedule with that value
 * - If the previously-active timer was using a per-tab delay → reschedule back
 *   to the effective base delay (group/window/global)
 * - Otherwise → leave the periodic timer untouched
 *
 * @param newTabUrl - URL of the newly active tab
 * @param windowId - Target window ID (always available after a successful switch)
 * @param mode - Whether the active timer is global hybrid or per-window
 */
async function maybeRescheduleForPerTabDelay(
  newTabUrl: string | undefined,
  windowId: number,
  mode: 'global' | 'window'
): Promise<void> {
  // Cheap short-circuit: if no per-tab delays exist anywhere, skip everything.
  const tabDelays = await getTabDelays();
  const hasAnyTabDelays = Object.keys(tabDelays).length > 0;

  // Track which delay value the timer was previously running with
  // so we know whether a reschedule is actually needed.
  const stateKey = mode === 'global' ? 'currentTimerDelay' : `currentTimerDelay-${windowId}`;
  const stored = await chrome.storage.local.get(stateKey);
  const previousTimerDelay: number | undefined = stored[stateKey];

  if (!hasAnyTabDelays && previousTimerDelay === undefined) {
    // Nothing was rescheduled previously and nothing to apply now.
    return;
  }

  // Compute the new effective delay including per-tab lookup
  const data = await chrome.storage.local.get(['delayTime', 'windowStates']);
  const globalDelay = (data['delayTime'] as number | undefined) ?? 5000;
  const windowStates = (data['windowStates'] as Record<string, any> | undefined) || {};

  const result = await getEffectiveDelay(globalDelay, windowId, windowStates, newTabUrl);

  // Only reschedule when the timer's delay is actually changing
  if (previousTimerDelay !== undefined && previousTimerDelay === result.delay) {
    return;
  }

  if (mode === 'global') {
    await rescheduleHybridTimer(result.delay);
  } else {
    await windowTimerManager.rescheduleTimer(windowId, result.delay);
  }

  await chrome.storage.local.set({ [stateKey]: result.delay });

  await logger.info('TabSwitcher', 'Timer rescheduled after switch', {
    mode,
    windowId,
    newDelayMs: result.delay,
    source: result.source,
  });
}
