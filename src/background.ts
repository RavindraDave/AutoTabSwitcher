/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

import { isPacked } from './utils/environment.js';
import { MIN_DELAY_MS_DEVELOPMENT, MIN_DELAY_MS_PRODUCTION, DEFAULT_ENABLED } from './core/constants.js';
import { initializeStorage, getSettings, migrateToSwitchingMode, getSwitchingMode, isValidWindowId, windowExists } from './core/storage.js';
import { setupActivityListeners, isPaused } from './core/activity-tracker.js';
import { toggleHybridTimer, setupAlarmListener } from './core/timing-hybrid.js';
import { updateBadge } from './core/badge-manager.js';
import { switchTab } from './core/tab-switcher.js';
import { logger, logModeChange, logWindowToggle } from './core/logger.js';
import { WindowTimerManager } from './core/window-timer-manager.js';

// Determine minimum delay based on environment
const MIN_DELAY_MS = isPacked() ? MIN_DELAY_MS_PRODUCTION : MIN_DELAY_MS_DEVELOPMENT;
const DEFAULT_DELAY_TIME = MIN_DELAY_MS;

// Initialize Window Timer Manager for per-window timers (Window Mode only)
const windowTimerManager = new WindowTimerManager();

/**
 * Debounce timer for storage changes to prevent race conditions
 */
let storageChangeTimeout: number | undefined;

/**
 * Start or stop the tab switcher using hybrid timing mechanism
 * ENHANCED: Now supports both Global Mode (existing behavior) and Window Mode (new)
 * NON-BREAKING: Global Mode uses exact same code path as before
 */
async function toggleTabSwitcher(): Promise<void> {
  try {
    // Get current settings from storage - include switchingMode field
    const data = await getSettings([
      'enabled', 'delayTime', 'windowMode', 'selectedWindowId',
      'switchingMode', 'operatingMode', 'windowStates'
    ]);
    const enabled = data.enabled ?? DEFAULT_ENABLED;
    const delayTime = data.delayTime ?? DEFAULT_DELAY_TIME;
    // Get switching mode with backward compatibility
    const switchingMode = getSwitchingMode(data);

    await logger.info('TabSwitcher', 'Toggle tab switcher', {
      enabled,
      delayTimeMs: delayTime,
      windowMode: data.windowMode, // Legacy field
      switchingMode, // Current mode field
      selectedWindowId: data.selectedWindowId,
    });

    // Route based on switching mode
    if (switchingMode === 'global') {
      // GLOBAL MODE: Use existing code path - NO CHANGES to behavior
      // This is the current behavior and remains 100% unchanged
      await toggleHybridTimer(enabled, delayTime, MIN_DELAY_MS);
    } else {
      // WINDOW MODE: New feature - per-window control
      // This is a NEW code path, isolated from existing logic
      await handleWindowModeToggle(data.windowStates || {}, delayTime);
    }
  } catch (error) {
    console.error('Error toggling tab switcher:', error);
    await logger.error('TabSwitcher', 'Failed to toggle tab switcher', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if a window is being disabled in the windowStates change
 * BUGFIX: Helper to detect disable operations for immediate handling
 */
function isWindowBeingDisabled(change: any): boolean {
  if (!change || !change.oldValue || !change.newValue) {
    return false;
  }

  const oldStates = change.oldValue;
  const newStates = change.newValue;

  // Check if any window went from enabled to disabled
  for (const windowId in newStates) {
    const wasEnabled = oldStates[windowId]?.enabled ?? false;
    const isEnabled = newStates[windowId]?.enabled ?? false;

    if (wasEnabled && !isEnabled) {
      return true; // Found a window being disabled
    }
  }

  return false;
}

/**
 * Handle settings change logging and badge updates
 * BUGFIX: Extracted from debounced handler for reuse
 */
async function handleSettingsChange(changes: any): Promise<void> {
  // Enhanced logging for switching mode changes (check both new and legacy fields)
  if ('switchingMode' in changes || 'operatingMode' in changes) {
    const modeChange = changes['switchingMode'] || changes['operatingMode'];
    await logModeChange({
      previousMode: modeChange.oldValue || 'global',
      newMode: modeChange.newValue || 'global',
    });

    // Update badge when switching mode changes
    const data = await chrome.storage.local.get(['enabled']);
    await updateBadge(data['enabled'] ?? false, false);
  }

  // Enhanced logging for window state changes
  if ('windowStates' in changes) {
    const oldStates = changes['windowStates'].oldValue || {};
    const newStates = changes['windowStates'].newValue || {};

    // Find which window(s) changed
    const allWindowIds = new Set([...Object.keys(oldStates), ...Object.keys(newStates)]);

    for (const windowIdStr of allWindowIds) {
      const windowId = Number(windowIdStr);
      const oldEnabled = oldStates[windowId]?.enabled ?? false;
      const newEnabled = newStates[windowId]?.enabled ?? false;

      if (oldEnabled !== newEnabled) {
        await logWindowToggle({
          windowId,
          enabled: newEnabled,
          mode: 'window',
        });
      }
    }

    // Update badge when window states change in Window mode
    const data = await chrome.storage.local.get(['switchingMode', 'operatingMode']);
    const mode = getSwitchingMode(data);
    if (mode === 'window') {
      // Update all badges to reflect new window states
      await updateBadge(false, false); // enabled param is ignored in window mode
    }
  }

  // Enhanced logging for global enabled changes
  if ('enabled' in changes) {
    const data = await chrome.storage.local.get(['switchingMode', 'operatingMode']);
    const mode = getSwitchingMode(data);

    if (mode === 'global') {
      await logWindowToggle({
        windowId: 0, // 0 indicates global
        enabled: changes['enabled'].newValue ?? false,
        mode: 'global',
      });
    }
  }

  // Log setting changes
  const changedSettings: Record<string, any> = {};
  for (const [key, change] of Object.entries(changes)) {
    const typedChange = change as { oldValue?: any; newValue?: any };
    changedSettings[key] = {
      old: typedChange.oldValue,
      new: typedChange.newValue,
    };
  }

  logger.info('Settings', 'Settings changed', changedSettings);
}

/**
 * Handle Window Mode toggle - NEW function for per-window control
 * This is isolated from existing global mode logic
 */
async function handleWindowModeToggle(
  windowStates: { [windowId: number]: { enabled: boolean; enabledTimestamp?: number; lastSwitchTime?: number } },
  delayTime: number
): Promise<void> {
  try {
    // Stop all existing window timers first
    await windowTimerManager.stopAllTimers();

    // Start timers for enabled windows
    for (const [windowIdStr, state] of Object.entries(windowStates)) {
      const windowId = parseInt(windowIdStr);
      // SECURITY: Validate windowId before operations
      if (!isValidWindowId(windowId)) {
        console.warn(`Invalid windowId in windowStates: ${windowIdStr}`);
        continue;
      }

      // SECURITY: Verify window still exists before starting timer
      if (state.enabled) {
        const exists = await windowExists(windowId);
        if (exists) {
          await windowTimerManager.startTimer(windowId, delayTime);
          await logger.info('WindowMode', 'Started timer for window', { windowId, delayTime });
        } else {
          console.warn(`Window ${windowId} no longer exists, skipping timer start`);
        }
      }
    }
  } catch (error) {
    console.error('Error in handleWindowModeToggle:', error);
    await logger.error('WindowMode', 'Error in handleWindowModeToggle', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle storage changes - restart alarm if settings changed
 * ENHANCED: Now includes switchingMode and windowStates
 * BUGFIX: Skip debouncing for disable operations to prevent race conditions
 */
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== 'local') {
    return;
  }

  const relevantChanges = 'enabled' in changes || 'delayTime' in changes ||
    'windowMode' in changes || 'selectedWindowId' in changes ||
    'switchingMode' in changes || 'operatingMode' in changes || 'windowStates' in changes;

  if (relevantChanges) {
    // BUGFIX: Detect if this is a disable operation
    const isDisableOperation =
      ('enabled' in changes && changes['enabled'].newValue === false) ||
      ('windowStates' in changes && isWindowBeingDisabled(changes['windowStates']));

    if (isDisableOperation) {
      // BUGFIX: For disable operations, execute IMMEDIATELY without debouncing
      console.log('Settings changed (disable operation), stopping tab switcher immediately');

      // Clear any existing timeout
      if (storageChangeTimeout !== undefined) {
        clearTimeout(storageChangeTimeout);
        storageChangeTimeout = undefined;
      }

      // Execute immediately
      await handleSettingsChange(changes);
      await toggleTabSwitcher();
    } else {
      // For enable/update operations, use debouncing as before
      console.log('Settings changed, restarting tab switcher (debounced)');

      // Clear any existing timeout to debounce rapid changes
      if (storageChangeTimeout !== undefined) {
        clearTimeout(storageChangeTimeout);
      }

      // Debounce for 100ms to prevent race conditions
      storageChangeTimeout = setTimeout(async () => {
        storageChangeTimeout = undefined;

        // Use the extracted handler for consistency
        await handleSettingsChange(changes);
        await toggleTabSwitcher();
      }, 100) as unknown as number;
    }
  }
});

/**
 * Set default values when extension is first installed
 * ENHANCED: Now includes migration for existing users
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  await logger.info('Lifecycle', 'Extension installed/updated', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  if (details.reason === 'install') {
    await initializeStorage(DEFAULT_DELAY_TIME);

    // Check if user has seen onboarding
    const data = await getSettings(['hasSeenOnboarding']);
    if (!data.hasSeenOnboarding) {
      // Open onboarding tour
      await chrome.tabs.create({ url: 'onboarding/onboarding.html' });
      await logger.info('Onboarding', 'Opened onboarding tour for new user');
    }
  } else if (details.reason === 'update') {
    // Migrate existing users to new switching mode system
    // NON-BREAKING: Defaults to 'global' mode to preserve existing behavior
    await migrateToSwitchingMode();
  }

  // Always update badge and restart switcher on install/update
  await toggleTabSwitcher();
});

/**
 * Handle browser startup - check if auto-start is enabled
 * This fires when the browser starts (not when service worker wakes)
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started, checking auto-start setting');
  await logger.info('Lifecycle', 'Browser started');

  try {
    // Check if auto-start on browser startup is enabled
    const data = await getSettings(['enableOnStartup', 'enabled', 'switchingMode', 'operatingMode', 'windowStates']);
    const enableOnStartup = data.enableOnStartup ?? false;
    const switchingMode = getSwitchingMode(data);

    if (enableOnStartup) {
      console.log('Auto-start enabled, enabling tab switching');
      await logger.info('Lifecycle', 'Auto-start enabled, activating tab switching', {
        switchingMode
      });

      // BUGFIX: Handle both Global and Window modes
      if (switchingMode === 'global') {
        // Global mode: set enabled flag
        await chrome.storage.local.set({ enabled: true });
      } else {
        // Window mode: enable all currently open windows
        const windows = await chrome.windows.getAll();
        const windowStates = data.windowStates || {};
        const now = Date.now();

        for (const window of windows) {
          if (window.id !== undefined) {
            windowStates[window.id] = {
              enabled: true,
              enabledTimestamp: now,
              lastSwitchTime: now
            };
          }
        }

        await chrome.storage.local.set({ windowStates });
        await logger.info('Lifecycle', 'Enabled all windows on startup', {
          windowCount: windows.length
        });
      }

      // The storage change listener will automatically call toggleTabSwitcher()
    } else {
      console.log('Auto-start disabled, restoring previous state');
      await logger.info('Lifecycle', 'Auto-start disabled, restoring previous state', {
        previouslyEnabled: data.enabled ?? false,
        switchingMode
      });

      // Just restore the previous state
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in startup handler:', error);
    await logger.error('Lifecycle', 'Error in startup handler', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback: restore state anyway
    await toggleTabSwitcher();
  }
});

/**
 * Handle new window creation - ensure switcher is running if enabled
 */
chrome.windows.onCreated.addListener(async () => {
  try {
    const data = await getSettings(['enabled']);
    if (data.enabled) {
      console.log('New window created, ensuring switcher is active');
      await logger.info('Window', 'New window created, ensuring switcher active');
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in window creation handler:', error);
    await logger.error('Window', 'Error in window creation handler', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Handle window focus changes - update badge for current-window mode
 * When user switches between windows, update badge to show correct status
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  // windowId is -1 (WINDOW_ID_NONE) when all Chrome windows lose focus
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  try {
    const data = await getSettings(['windowMode']);
    const windowMode = data.windowMode ?? 'global';

    // Only update badge if in current-window mode
    if (windowMode === 'current-window') {
      // Force badge update by re-toggling
      await toggleTabSwitcher();
    }
  } catch (error) {
    console.error('Error in window focus change handler:', error);
  }
});

/**
 * Handle window removal - cleanup window states (Window Mode)
 * NEW: Cleanup per-window state when window is closed
 */
chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    // SECURITY: Validate windowId
    if (!isValidWindowId(windowId)) {
      console.warn(`Invalid windowId in onRemoved handler: ${windowId}`);
      return;
    }

    const data = await getSettings(['switchingMode', 'operatingMode', 'windowStates']);
    const switchingMode = getSwitchingMode(data);

    // Only cleanup if in Window Mode
    if (switchingMode === 'window' && data.windowStates) {
      // Stop timer for this window
      await windowTimerManager.stopTimer(windowId);

      // Remove window state from storage
      const windowStates = { ...data.windowStates };
      delete windowStates[windowId];
      await chrome.storage.local.set({ windowStates });

      await logger.info('Window', 'Window closed, cleaned up state', { windowId });
      console.log(`Window ${windowId} closed, cleaned up state`);
    }
  } catch (error) {
    console.error('Error in window removal handler:', error);
    await logger.error('Window', 'Error in window removal handler', {
      error: error instanceof Error ? error.message : String(error),
      windowId,
    });
  }
});

/**
 * Handle tab creation - set badge for new tabs
 */
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    if (tab.id === undefined) return;

    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    // Update badge for the newly created tab
    await updateBadge(enabled, false, tab.id);
  } catch (error) {
    console.error('Error in tab creation handler:', error);
  }
});

/**
 * Handle tab updates - ensure badge stays correct when pages reload
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  try {
    // Only update badge when tab is loading or complete (page refresh)
    if (changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      const data = await getSettings(['enabled']);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // Update badge for this tab
      await updateBadge(enabled, false, tabId);
    }
  } catch (error) {
    console.error('Error in tab update handler:', error);
  }
});

/**
 * Handle tab being moved between windows - update badge for the moved tab
 */
chrome.tabs.onAttached.addListener(async (tabId, _attachInfo) => {
  try {
    const data = await getSettings(['enabled']);
    const enabled = data.enabled ?? DEFAULT_ENABLED;

    // Update badge for the tab in its new window
    await updateBadge(enabled, false, tabId);
  } catch (error) {
    console.error('Error in tab attach handler:', error);
  }
});

// Set up alarm listener (for hybrid timing)
setupAlarmListener();

// Set up additional alarm listener for window-specific timers (Window Mode)
// NEW: This is additive and doesn't interfere with existing alarm handling
chrome.alarms.onAlarm.addListener(async (alarm) => {
  // Check if this is a window-specific alarm
  const windowId = WindowTimerManager.getWindowIdFromAlarm(alarm.name);
  if (windowId !== null) {
    try {
      // SECURITY: Validate windowId
      if (!isValidWindowId(windowId)) {
        console.warn(`Invalid windowId from alarm: ${windowId}`);
        return;
      }

      const data = await getSettings(['switchingMode', 'operatingMode', 'windowStates', 'delayTime']);
      const switchingMode = getSwitchingMode(data);

      // Only process if in Window Mode
      if (switchingMode === 'window' && data.windowStates && data.windowStates[windowId]) {
        // BUGFIX: Check if this window is being stopped
        if (windowTimerManager.isStopping(windowId)) {
          console.log(`Window ${windowId} timer alarm fired but window is being stopped, aborting`);
          return;
        }

        const windowState = data.windowStates[windowId];

        if (windowState.enabled) {
          // BUGFIX: Re-check after async storage operation
          if (windowTimerManager.isStopping(windowId)) {
            return;
          }

          // Check if switching is paused due to user activity
          const paused = await isPaused();

          // BUGFIX: Final check before tab switch
          if (windowTimerManager.isStopping(windowId)) {
            return;
          }

          if (!paused) {
            // Perform tab switch for this window
            const success = await switchTab(windowId);
            if (success) {
              await logger.info('WindowMode', 'Tab switched for window', { windowId });
            }
          } else {
            console.log(`Auto-switching paused for window ${windowId} due to recent user activity`);
          }
        }
      }
    } catch (error) {
      console.error(`Error handling window timer alarm for window ${windowId}:`, error);
      await logger.error('WindowMode', 'Error in window timer alarm handler', {
        error: error instanceof Error ? error.message : String(error),
        windowId,
      });
    }
  }
});

// Set up activity detection listeners
setupActivityListeners();

// Initialize on script load (when service worker starts)
// Run migration first to ensure switchingMode is set
migrateToSwitchingMode().then(() => toggleTabSwitcher());
