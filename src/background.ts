/**
 * Auto Tab Switcher - Background Service Worker
 *
 * This service worker uses the chrome.alarms API for reliable periodic execution
 * in Manifest V3, as service workers can be terminated at any time.
 * All state is persisted in chrome.storage.local.
 */

import { DEFAULT_ENABLED, MIN_DELAY_MS_PRODUCTION } from './core/constants.js';
import { initializeStorage, getSettings, migrateToSwitchingMode, getSwitchingMode, isValidWindowId, windowExists } from './core/storage.js';
import { setupActivityListeners, isPaused } from './core/activity-tracker.js';
import { isManuallyPaused, clearManualPause, toggleManualPause } from './core/manual-pause-tracker.js';
import { toggleHybridTimer, setupAlarmListener } from './core/timing-hybrid.js';
import { updateBadge } from './core/badge-manager.js';
import { switchTab } from './core/tab-switcher.js';
import { logger, logModeChange, logWindowToggle } from './core/logger.js';
import { WindowTimerManager } from './core/window-timer-manager.js';
import { canAccessPremium } from './core/premium-access.js';
import { PREMIUM_FEATURES_AVAILABLE } from './core/build-config.js';
import { getEffectiveDelay } from './core/delay-calculator.js';
import { initializeIdleAutoStart, reconfigureIdleDetection } from './core/idle-auto-start.js';
import { initializeContextMenus, handleContextMenuClick, reconfigureContextMenus } from './core/context-menu-manager.js';

// Type imports for premium managers
import type { SessionManager } from './premium/SessionManager.js';
import type { RefreshManager } from './premium/RefreshManager.js';

// Premium feature managers (only imported if premium features are enabled at build time)
// Note: SkipRuleEngine and ConfigManager are imported in tab-switcher.ts where they're used
let sessionManager: SessionManager | null = null;
let refreshManager: RefreshManager | null = null;
// ScheduleManager is exported as singleton instance, not class
let scheduleManager: { initialize(): Promise<void>; checkSchedules(now?: number): Promise<void> } | null = null;

// Dynamically import premium managers if available
if (PREMIUM_FEATURES_AVAILABLE) {
  import('./premium/SessionManager.js').then(module => {
    sessionManager = module.sessionManager;
  }).catch(() => {
    logger.warn('Premium', 'SessionManager not available');
  });

  import('./premium/RefreshManager.js').then(module => {
    refreshManager = module.refreshManager;
  }).catch(() => {
    logger.warn('Premium', 'RefreshManager not available');
  });

  import('./premium/ScheduleManager.js').then(async module => {
    scheduleManager = module.scheduleManager;
    await scheduleManager.initialize();
  }).catch(() => {
    logger.warn('Premium', 'ScheduleManager not available');
  });
}

// Default delay time: 5 seconds for all environments
const DEFAULT_DELAY_TIME = 5000; // 5 seconds

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
      // GLOBAL MODE: Check for group custom delay override
      const delayResult = await getEffectiveDelay(delayTime);
      await toggleHybridTimer(enabled, delayResult.delay, MIN_DELAY_MS_PRODUCTION);
      if (delayResult.source === 'group') {
        await logger.info('TabSwitcher', 'Using group custom delay in global mode', {
          delay: delayResult.delay
        });
      }
    } else {
      // WINDOW MODE: New feature - per-window control
      // This is a NEW code path, isolated from existing logic
      await handleWindowModeToggle(data.windowStates || {}, delayTime);
    }
  } catch (error) {
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
    // Check for manual pause state to ensure badge reflects pause correctly
    const data = await chrome.storage.local.get(['enabled', 'manuallyPaused', 'manuallyPausedWindows']);
    const manuallyPaused = data['manuallyPaused'] ?? false;
    const manuallyPausedWindows = data['manuallyPausedWindows'] ?? {};

    // Check if any window is manually paused (for window mode badge updates)
    const anyWindowPaused = Object.values(manuallyPausedWindows).some(paused => paused === true);
    const isPaused = manuallyPaused || anyWindowPaused;

    await updateBadge(data['enabled'] ?? false, isPaused);
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
    const data = await chrome.storage.local.get(['switchingMode', 'operatingMode', 'manuallyPaused', 'manuallyPausedWindows']);
    const mode = getSwitchingMode(data);
    if (mode === 'window') {
      // Check for manual pause state to ensure badge reflects pause correctly
      const manuallyPaused = data['manuallyPaused'] ?? false;
      const manuallyPausedWindows = data['manuallyPausedWindows'] ?? {};

      // Check if any window is manually paused (for window mode badge updates)
      const anyWindowPaused = Object.values(manuallyPausedWindows).some(paused => paused === true);
      const isPaused = manuallyPaused || anyWindowPaused;

      // Update all badges to reflect new window states
      // enabled param is ignored in window mode (each window has independent state)
      await updateBadge(false, isPaused);
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
  windowStates: { [windowId: number]: { enabled: boolean; enabledTimestamp?: number; lastSwitchTime?: number; customDelayTime?: number } },
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
        await logger.warn('WindowMode', 'Invalid windowId in windowStates', {
          windowIdStr
        });
        continue;
      }

      // SECURITY: Verify window still exists before starting timer
      if (state.enabled) {
        const exists = await windowExists(windowId);
        if (exists) {
          // Calculate effective delay with precedence: Group > Window > Global
          const delayResult = await getEffectiveDelay(delayTime, windowId, windowStates);
          await windowTimerManager.startTimer(windowId, delayResult.delay);
          await logger.info('WindowMode', 'Started timer for window', {
            windowId,
            delayTime: delayResult.delay,
            delaySource: delayResult.source
          });
        } else {
          await logger.warn('WindowMode', 'Window no longer exists, skipping timer start', {
            windowId
          });
        }
      }
    }
  } catch (error) {
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

  // Reconfigure new features when their settings change
  if ('idleAutoStart' in changes || 'idleThresholdSeconds' in changes || 'idleStopOnActive' in changes) {
    reconfigureIdleDetection();
  }
  if ('contextMenuEnabled' in changes) {
    reconfigureContextMenus();
  }

  const relevantChanges = 'enabled' in changes || 'delayTime' in changes ||
    'windowMode' in changes || 'selectedWindowId' in changes ||
    'switchingMode' in changes || 'operatingMode' in changes || 'windowStates' in changes ||
    'activeGroupId' in changes || 'tabGroups' in changes;

  if (relevantChanges) {
    // BUGFIX: Detect if this is a disable operation
    const isDisableOperation =
      ('enabled' in changes && changes['enabled'].newValue === false) ||
      ('windowStates' in changes && isWindowBeingDisabled(changes['windowStates']));

    if (isDisableOperation) {
      // BUGFIX: For disable operations, execute IMMEDIATELY without debouncing
      await logger.info('Settings', 'Settings changed (disable operation), stopping immediately');

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
      await logger.info('Settings', 'Settings changed, restarting tab switcher (debounced)');

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

  // Premium: Initialize RefreshManager on install/update
  if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium()) {
    try {
      if (refreshManager) {
        await refreshManager.initialize();
        await logger.info('Premium', 'RefreshManager initialized on install/update');
      }
    } catch (error) {
      await logger.error('Premium', 'Error initializing RefreshManager on install/update', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Initialize new features
  await initializeContextMenus();
  await initializeIdleAutoStart();

  // Always update badge and restart switcher on install/update
  await toggleTabSwitcher();
});

/**
 * Handle browser startup - check if auto-start is enabled
 * This fires when the browser starts (not when service worker wakes)
 */
chrome.runtime.onStartup.addListener(async () => {
  await logger.info('Lifecycle', 'Browser started');

  try {
    // Clear manual pause state on browser startup (fresh start)
    await clearManualPause();

    // Premium: Initialize RefreshManager and launch auto-start sessions
    if (PREMIUM_FEATURES_AVAILABLE && await canAccessPremium()) {
      try {
        // Initialize RefreshManager
        if (refreshManager) {
          await refreshManager.initialize();
          await logger.info('Premium', 'RefreshManager initialized on startup');
        }

        // Launch auto-start sessions
        if (sessionManager) {
          await sessionManager.launchAutoStartSessions();
          await logger.info('Premium', 'Auto-start sessions launched');
        }
      } catch (error) {
        await logger.error('Premium', 'Error initializing premium features on startup', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Initialize new features on startup
    await initializeIdleAutoStart();

    // Check if auto-start on browser startup is enabled
    const data = await getSettings(['enableOnStartup', 'enabled', 'switchingMode', 'operatingMode', 'windowStates']);
    const enableOnStartup = data.enableOnStartup ?? false;
    const switchingMode = getSwitchingMode(data);

    if (enableOnStartup) {
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
      await logger.info('Lifecycle', 'Auto-start disabled, restoring previous state', {
        previouslyEnabled: data.enabled ?? false,
        switchingMode
      });

      // Just restore the previous state
      await toggleTabSwitcher();
    }
  } catch (error) {
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
      await logger.info('Window', 'New window created, ensuring switcher active');
      await toggleTabSwitcher();
    }
  } catch (error) {
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
    await logger.error('Window', 'Error in window focus change handler', {
      error: error instanceof Error ? error.message : String(error),
    });
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
      await logger.warn('Window', 'Invalid windowId in onRemoved handler', {
        windowId
      });
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
    }
  } catch (error) {
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
    await logger.error('Tab', 'Error in tab creation handler', {
      error: error instanceof Error ? error.message : String(error),
    });
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
    await logger.error('Tab', 'Error in tab update handler', {
      error: error instanceof Error ? error.message : String(error),
    });
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
    await logger.error('Tab', 'Error in tab attach handler', {
      error: error instanceof Error ? error.message : String(error),
    });
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
        await logger.warn('WindowMode', 'Invalid windowId from alarm', {
          windowId
        });
        return;
      }

      const data = await getSettings(['switchingMode', 'operatingMode', 'windowStates', 'delayTime']);
      const switchingMode = getSwitchingMode(data);

      // Only process if in Window Mode
      if (switchingMode === 'window' && data.windowStates && data.windowStates[windowId]) {
        // BUGFIX: Check if this window is being stopped
        if (windowTimerManager.isStopping(windowId)) {
          await logger.info('WindowMode', 'Window timer alarm fired but window is stopping, aborting', {
            windowId
          });
          return;
        }

        const windowState = data.windowStates[windowId];

        if (windowState.enabled) {
          // BUGFIX: Re-check after async storage operation
          if (windowTimerManager.isStopping(windowId)) {
            return;
          }

          // Check both activity pause and manual pause
          const activityPaused = await isPaused();
          const manualPaused = await isManuallyPaused(windowId);
          const isPausedState = activityPaused || manualPaused;

          // BUGFIX: Final check before tab switch
          if (windowTimerManager.isStopping(windowId)) {
            return;
          }

          if (!isPausedState) {
            // Perform tab switch for this window
            const success = await switchTab(windowId);
            if (success) {
              await logger.info('WindowMode', 'Tab switched for window', { windowId });
            }
          } else {
            if (manualPaused) {
              await logger.info('WindowMode', 'Auto-switching paused manually (keyboard shortcut)', {
                windowId
              });
            } else {
              await logger.info('WindowMode', 'Auto-switching paused due to user activity', {
                windowId
              });
            }
          }
        }
      }
    } catch (error) {
      await logger.error('WindowMode', 'Error in window timer alarm handler', {
        error: error instanceof Error ? error.message : String(error),
        windowId,
      });
    }
  }
});

// Set up activity detection listeners
setupActivityListeners();

// Set up keyboard command listener for pause/resume shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-pause') {
    try {
      // Check if auto-switching is enabled first
      const data = await getSettings(['enabled', 'switchingMode', 'operatingMode', 'windowStates']);
      const switchingMode = getSwitchingMode(data);
      const enabled = data.enabled ?? DEFAULT_ENABLED;

      // In Global Mode: Check if globally enabled
      // In Window Mode: Check if any window is enabled
      let isAnythingEnabled = false;
      if (switchingMode === 'global') {
        isAnythingEnabled = enabled;
      } else {
        // Window Mode: Check if current window or any window is enabled
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow.id && data.windowStates) {
          isAnythingEnabled = data.windowStates[currentWindow.id]?.enabled ?? false;
        }
      }

      // Only allow pausing if something is actually enabled
      if (!isAnythingEnabled) {
        await logger.warn('KeyboardShortcut', 'Cannot pause: auto-switching is not enabled', {
          mode: switchingMode
        });
        return;
      }

      // Toggle manual pause state
      const newState = await toggleManualPause();

      // Update badge to reflect pause state
      await updateBadge(enabled, newState);

      await logger.info('KeyboardShortcut', 'Manual pause toggled', {
        paused: newState,
        mode: switchingMode
      });
    } catch (error) {
      await logger.error('KeyboardShortcut', 'Error toggling manual pause', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

// Set up context menu click listener
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Initialize on script load (when service worker starts)
// Run migration first to ensure switchingMode is set
migrateToSwitchingMode().then(() => toggleTabSwitcher());
