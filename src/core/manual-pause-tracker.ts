/**
 * Manual pause tracking for keyboard shortcut pause functionality
 *
 * This module manages the manual pause state triggered by keyboard shortcuts.
 * Manual pause takes priority over activity pause and persists until user resumes.
 */

import { StorageData } from './types.js';
import { logger } from './logger.js';

/**
 * Check if auto-switching is manually paused (via keyboard shortcut)
 *
 * In Global Mode: Returns global manual pause state
 * In Window Mode: Returns manual pause state for the specified window
 *
 * @param windowId - Optional window ID for window-specific pause state
 * @returns true if manually paused, false otherwise
 */
export async function isManuallyPaused(windowId?: number): Promise<boolean> {
  const data = await chrome.storage.local.get([
    'manuallyPaused',
    'manuallyPausedWindows',
    'switchingMode'
  ]) as StorageData;

  const switchingMode = data.switchingMode ?? 'global';

  if (switchingMode === 'window' && windowId !== undefined) {
    // Window Mode: Check per-window pause state
    const pausedWindows = data.manuallyPausedWindows ?? {};
    return pausedWindows[windowId] ?? false;
  } else {
    // Global Mode: Check global pause state
    return data.manuallyPaused ?? false;
  }
}

/**
 * Toggle manual pause state
 *
 * In Global Mode: Toggles global manual pause
 * In Window Mode: Toggles manual pause for the current focused window
 *
 * @returns The new pause state (true = paused, false = resumed)
 */
export async function toggleManualPause(): Promise<boolean> {
  const data = await chrome.storage.local.get([
    'manuallyPaused',
    'manuallyPausedWindows',
    'switchingMode'
  ]) as StorageData;

  const switchingMode = data.switchingMode ?? 'global';

  if (switchingMode === 'window') {
    // Window Mode: Toggle pause for current focused window
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow.id) {
      await logger.warn('ManualPauseTracker', 'Cannot toggle pause: no current window');
      return false;
    }

    const pausedWindows = data.manuallyPausedWindows ?? {};
    const currentState = pausedWindows[currentWindow.id] ?? false;
    const newState = !currentState;

    pausedWindows[currentWindow.id] = newState;
    await chrome.storage.local.set({ manuallyPausedWindows: pausedWindows });

    await logger.info('ManualPauseTracker', 'Manual pause toggled for window', {
      windowId: currentWindow.id,
      paused: newState
    });

    return newState;
  } else {
    // Global Mode: Toggle global pause
    const currentState = data.manuallyPaused ?? false;
    const newState = !currentState;

    await chrome.storage.local.set({ manuallyPaused: newState });

    await logger.info('ManualPauseTracker', 'Manual pause toggled globally', {
      paused: newState
    });

    return newState;
  }
}

/**
 * Set manual pause state explicitly
 *
 * @param paused - Whether to pause or resume
 * @param windowId - Optional window ID for window-specific pause (Window Mode only)
 */
export async function setManualPause(paused: boolean, windowId?: number): Promise<void> {
  const data = await chrome.storage.local.get([
    'switchingMode',
    'manuallyPausedWindows'
  ]) as StorageData;

  const switchingMode = data.switchingMode ?? 'global';

  if (switchingMode === 'window' && windowId !== undefined) {
    // Window Mode: Set pause for specific window
    const pausedWindows = data.manuallyPausedWindows ?? {};
    pausedWindows[windowId] = paused;
    await chrome.storage.local.set({ manuallyPausedWindows: pausedWindows });

    await logger.info('ManualPauseTracker', 'Manual pause set for window', {
      windowId,
      paused
    });
  } else {
    // Global Mode: Set global pause
    await chrome.storage.local.set({ manuallyPaused: paused });

    await logger.info('ManualPauseTracker', 'Manual pause set globally', {
      paused
    });
  }
}

/**
 * Clear all manual pause states
 * Called on browser startup to ensure fresh start
 */
export async function clearManualPause(): Promise<void> {
  await chrome.storage.local.set({
    manuallyPaused: false,
    manuallyPausedWindows: {}
  });

  await logger.info('ManualPauseTracker', 'Manual pause states cleared');
}
