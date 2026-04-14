/**
 * Smart Audio Management (Phase 1.2)
 *
 * Mutes inactive tabs in the rotating window so only the currently
 * displayed tab plays sound. Mirrors the behavior of "Slideshow Tabs".
 *
 * Key behaviors:
 * - Snapshot the original mute state of every tab we touch so it can be
 *   restored when audio management is disabled or the extension is uninstalled.
 * - Skip tabs that are already in the desired state to minimize chrome.tabs
 *   API churn.
 * - Tolerate tabs that have been closed between query and update (race-safe).
 * - Only operates on the same window as the rotating tab so audio in other
 *   windows is left alone.
 */

import { logger } from './logger.js';
import { getAudioManagementMode } from './storage.js';
import { StorageData } from './types.js';

/**
 * Apply the audio management policy after a tab switch.
 *
 * No-op when mode is 'off'. Otherwise, unmutes the new active tab and
 * mutes every other tab in the same window. Original mute states are
 * snapshotted on first touch so we can roll back later.
 *
 * @param windowId - Window in which the rotation just happened
 * @param newActiveTabId - Tab that is now active (will be unmuted)
 */
export async function applyAudioManagementForSwitch(
  windowId: number,
  newActiveTabId: number
): Promise<void> {
  const mode = await getAudioManagementMode();
  if (mode === 'off') {
    return;
  }

  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ windowId });
  } catch (error) {
    await logger.warn('AudioManager', 'Failed to query tabs for audio management', {
      windowId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  // Pull the snapshot of original mute states so we only record once per tab.
  const data = await chrome.storage.local.get('audioOriginalMuteStates') as StorageData;
  const originalStates = { ...(data.audioOriginalMuteStates || {}) };
  let snapshotChanged = false;

  for (const tab of tabs) {
    if (tab.id === undefined) continue;

    // Snapshot original mute state on first touch only.
    if (originalStates[tab.id] === undefined) {
      originalStates[tab.id] = tab.mutedInfo?.muted ?? false;
      snapshotChanged = true;
    }

    const shouldBeMuted = tab.id !== newActiveTabId;
    const isMuted = tab.mutedInfo?.muted ?? false;
    if (shouldBeMuted === isMuted) {
      continue; // Already in the desired state
    }

    try {
      await chrome.tabs.update(tab.id, { muted: shouldBeMuted });
    } catch (error) {
      // Tab may have closed between query and update; non-fatal
      await logger.debug('AudioManager', 'Tab update for mute failed (likely closed)', {
        tabId: tab.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (snapshotChanged) {
    await chrome.storage.local.set({ audioOriginalMuteStates: originalStates });
  }
}

/**
 * Restore every tab we previously muted to its original mute state.
 * Called when the user disables audio management or uninstalls the feature.
 */
export async function restoreAllOriginalMuteStates(): Promise<void> {
  const data = await chrome.storage.local.get('audioOriginalMuteStates') as StorageData;
  const originalStates = data.audioOriginalMuteStates || {};

  const tabIds = Object.keys(originalStates).map(Number).filter(id => Number.isFinite(id));
  if (tabIds.length === 0) {
    return;
  }

  for (const tabId of tabIds) {
    const originalMuted = originalStates[tabId];
    try {
      await chrome.tabs.update(tabId, { muted: originalMuted ?? false });
    } catch {
      // Tab is gone — silently skip
    }
  }

  await chrome.storage.local.set({ audioOriginalMuteStates: {} });
  await logger.info('AudioManager', 'Restored original mute states', {
    tabCount: tabIds.length,
  });
}

/**
 * Drop the snapshot for a closed tab so it doesn't leak into storage.
 * Wired up via chrome.tabs.onRemoved in background.ts.
 */
export async function forgetTabMuteSnapshot(tabId: number): Promise<void> {
  const data = await chrome.storage.local.get('audioOriginalMuteStates') as StorageData;
  const states = data.audioOriginalMuteStates;
  if (!states || states[tabId] === undefined) {
    return;
  }
  const updated = { ...states };
  delete updated[tabId];
  await chrome.storage.local.set({ audioOriginalMuteStates: updated });
}
