/**
 * Idle Auto-Start Manager
 *
 * Automatically starts tab cycling when the system goes idle,
 * and optionally stops when the user becomes active again.
 * Perfect for unattended dashboard/monitoring displays.
 *
 * Uses chrome.idle API for reliable system idle detection.
 */

import { logger } from './logger.js';
import { getIdleSettings, getSettings, getSwitchingMode } from './storage.js';
import { IdleState } from './types.js';
import { DEFAULT_IDLE_THRESHOLD_SECONDS, MIN_IDLE_THRESHOLD_SECONDS, MAX_IDLE_THRESHOLD_SECONDS } from './constants.js';

/**
 * Track whether idle auto-start triggered the current cycling session.
 * This prevents stopping cycling that was manually started by the user.
 */
let idleTriggeredStart = false;

/**
 * Track the current idle detection interval to avoid duplicate listeners.
 */
let idleListenerActive = false;

/**
 * Initialize idle auto-start by setting up the idle state change listener.
 * Should be called once from background.ts on startup.
 */
export async function initializeIdleAutoStart(): Promise<void> {
  const settings = await getIdleSettings();

  if (!settings.idleAutoStart) {
    await logger.info('IdleAutoStart', 'Idle auto-start is disabled');
    return;
  }

  await setupIdleDetection(settings.idleThresholdSeconds);
  await logger.info('IdleAutoStart', 'Idle auto-start initialized', {
    thresholdSeconds: settings.idleThresholdSeconds,
    stopOnActive: settings.idleStopOnActive,
  });
}

/**
 * Set up the chrome.idle detection interval and listener.
 */
export async function setupIdleDetection(thresholdSeconds: number): Promise<void> {
  // Clamp threshold to valid range
  const clamped = Math.max(
    MIN_IDLE_THRESHOLD_SECONDS,
    Math.min(MAX_IDLE_THRESHOLD_SECONDS, thresholdSeconds)
  );

  // Set the idle detection interval
  chrome.idle.setDetectionInterval(clamped);

  // Only add listener once
  if (!idleListenerActive) {
    chrome.idle.onStateChanged.addListener(handleIdleStateChange);
    idleListenerActive = true;
  }

  await logger.info('IdleAutoStart', 'Idle detection configured', {
    thresholdSeconds: clamped,
  });
}

/**
 * Tear down idle detection (when feature is disabled).
 */
export function teardownIdleDetection(): void {
  if (idleListenerActive) {
    chrome.idle.onStateChanged.removeListener(handleIdleStateChange);
    idleListenerActive = false;
    idleTriggeredStart = false;
  }
}

/**
 * Handle idle state changes from chrome.idle API.
 *
 * States:
 * - 'active': User is interacting with the system
 * - 'idle': No user input for the configured threshold
 * - 'locked': Screen is locked (treated same as idle)
 */
async function handleIdleStateChange(newState: string): Promise<void> {
  const state = newState as IdleState;
  const settings = await getIdleSettings();

  if (!settings.idleAutoStart) {
    return; // Feature disabled, ignore
  }

  await logger.info('IdleAutoStart', 'Idle state changed', { state });

  try {
    if (state === 'idle' || state === 'locked') {
      await handleSystemIdle();
    } else if (state === 'active') {
      await handleSystemActive(settings.idleStopOnActive);
    }
  } catch (error) {
    await logger.error('IdleAutoStart', 'Error handling idle state change', {
      error: error instanceof Error ? error.message : String(error),
      state,
    });
  }
}

/**
 * Handle system becoming idle - start tab cycling if not already running.
 */
async function handleSystemIdle(): Promise<void> {
  const data = await getSettings(['enabled', 'switchingMode', 'operatingMode', 'windowStates']);
  const switchingMode = getSwitchingMode(data);

  if (switchingMode === 'global') {
    if (data.enabled) {
      await logger.info('IdleAutoStart', 'System idle but cycling already active, skipping');
      return;
    }

    // Start cycling
    await chrome.storage.local.set({ enabled: true });
    idleTriggeredStart = true;
    await logger.info('IdleAutoStart', 'System idle - auto-started tab cycling (global mode)');
  } else {
    // Window mode: enable all open windows
    const windows = await chrome.windows.getAll();
    const windowStates = data.windowStates || {};
    const now = Date.now();
    let anyEnabled = false;

    for (const win of windows) {
      if (win.id !== undefined) {
        if (!windowStates[win.id]?.enabled) {
          windowStates[win.id] = {
            enabled: true,
            enabledTimestamp: now,
            lastSwitchTime: now,
          };
          anyEnabled = true;
        }
      }
    }

    if (anyEnabled) {
      await chrome.storage.local.set({ windowStates });
      idleTriggeredStart = true;
      await logger.info('IdleAutoStart', 'System idle - auto-started tab cycling (window mode)', {
        windowCount: windows.length,
      });
    } else {
      await logger.info('IdleAutoStart', 'System idle but all windows already cycling');
    }
  }
}

/**
 * Handle system becoming active - optionally stop cycling if it was idle-triggered.
 */
async function handleSystemActive(stopOnActive: boolean): Promise<void> {
  if (!stopOnActive || !idleTriggeredStart) {
    await logger.info('IdleAutoStart', 'System active - keeping current cycling state', {
      stopOnActive,
      idleTriggeredStart,
    });
    return;
  }

  const data = await getSettings(['switchingMode', 'operatingMode']);
  const switchingMode = getSwitchingMode(data);

  if (switchingMode === 'global') {
    await chrome.storage.local.set({ enabled: false });
    await logger.info('IdleAutoStart', 'System active - auto-stopped tab cycling (global mode)');
  } else {
    // Window mode: disable all windows
    const data2 = await getSettings(['windowStates']);
    const windowStates = data2.windowStates || {};

    for (const windowId of Object.keys(windowStates)) {
      const state = windowStates[Number(windowId)];
      if (state) {
        state.enabled = false;
      }
    }

    await chrome.storage.local.set({ windowStates });
    await logger.info('IdleAutoStart', 'System active - auto-stopped tab cycling (window mode)');
  }

  idleTriggeredStart = false;
}

/**
 * Reconfigure idle detection when settings change.
 */
export async function reconfigureIdleDetection(): Promise<void> {
  const settings = await getIdleSettings();

  if (settings.idleAutoStart) {
    await setupIdleDetection(settings.idleThresholdSeconds);
    await logger.info('IdleAutoStart', 'Reconfigured idle detection', {
      thresholdSeconds: settings.idleThresholdSeconds,
    });
  } else {
    teardownIdleDetection();
    await logger.info('IdleAutoStart', 'Idle detection disabled');
  }
}

/**
 * Check if the current cycling session was triggered by idle detection.
 */
export function wasIdleTriggered(): boolean {
  return idleTriggeredStart;
}
