/**
 * URL List Rotation Manager (Phase 2.1)
 *
 * Manages a dedicated "URL list" operating mode where the user defines a set
 * of URLs. The extension opens them in a dedicated window and rotates through
 * them sequentially, each with an optional per-URL display time.
 *
 * Lifecycle:
 *   1. User enables urlList mode and provides URL entries.
 *   2. `startUrlListRotation()` opens a new window with tabs for each URL.
 *   3. A chrome.alarm fires periodically; `advanceUrlListRotation()` switches
 *      to the next tab and (optionally) reschedules at a different interval
 *      if that entry has a custom delay.
 *   4. `stopUrlListRotation()` clears the alarm and optionally closes the
 *      managed window.
 */

import { logger } from './logger.js';
import { StorageData, UrlListConfig, UrlListEntry } from './types.js';
import { URL_LIST_ALARM_NAME, MAX_URL_LIST_ENTRIES } from './constants.js';
import { updateBadge } from './badge-manager.js';
import { recordTabSwitch } from './statistics-tracker.js';
import { notifyKioskOverlayOfSwitch } from './kiosk-manager.js';

/**
 * Start URL list rotation: open a window with all enabled URLs, then begin cycling.
 */
export async function startUrlListRotation(): Promise<void> {
  const data = await chrome.storage.local.get(['urlListConfig', 'delayTime', 'kioskMode']) as StorageData;
  const config = data.urlListConfig;
  if (!config || config.entries.length === 0) {
    await logger.warn('UrlListManager', 'No URL list entries configured');
    return;
  }

  const enabledEntries = config.entries.filter(e => e.enabled);
  if (enabledEntries.length === 0) {
    await logger.warn('UrlListManager', 'All URL list entries are disabled');
    return;
  }

  const urls = enabledEntries.map(e => e.url);

  let windowId: number | undefined;

  if (config.windowId) {
    try {
      await chrome.windows.get(config.windowId);
      windowId = config.windowId;
    } catch {
      windowId = undefined;
    }
  }

  if (!windowId) {
    const win = await chrome.windows.create({
      url: urls,
      focused: true,
      state: data.kioskMode ? 'fullscreen' : 'normal',
    });
    windowId = win.id;
  }

  if (windowId === undefined) {
    await logger.error('UrlListManager', 'Failed to create window for URL list');
    return;
  }

  const globalDelay = data.delayTime ?? 5000;
  const firstEntry = enabledEntries[0];
  const firstDelay = firstEntry?.delayMs ?? globalDelay;

  await chrome.storage.local.set({
    urlListConfig: { ...config, windowId, lastActiveIndex: 0 },
  });

  await chrome.alarms.create(URL_LIST_ALARM_NAME, { delayInMinutes: firstDelay / 60000 });

  await updateBadge(true);

  await logger.info('UrlListManager', 'Started URL list rotation', {
    windowId,
    entryCount: enabledEntries.length,
    firstDelayMs: firstDelay,
  });
}

/**
 * Advance to the next URL in the list. Called when the alarm fires.
 */
export async function advanceUrlListRotation(): Promise<void> {
  const data = await chrome.storage.local.get(['urlListConfig', 'delayTime', 'kioskMode', 'kioskOverlayEnabled']) as StorageData;
  const config = data.urlListConfig;
  if (!config || !config.windowId) {
    return;
  }

  const enabledEntries = config.entries.filter(e => e.enabled);
  if (enabledEntries.length === 0) {
    return;
  }

  const windowId = config.windowId;

  try {
    await chrome.windows.get(windowId);
  } catch {
    await logger.warn('UrlListManager', 'URL list window closed, stopping rotation');
    await stopUrlListRotation(false);
    return;
  }

  const tabs = await chrome.tabs.query({ windowId });
  if (tabs.length === 0) {
    return;
  }

  const currentIndex = config.lastActiveIndex ?? 0;
  const nextIndex = (currentIndex + 1) % enabledEntries.length;
  const nextEntry = enabledEntries[nextIndex];

  if (!nextEntry) return;

  const nextTab = tabs[nextIndex % tabs.length];
  if (!nextTab || nextTab.id === undefined) return;

  await chrome.tabs.update(nextTab.id, { active: true });

  if (nextTab.url !== nextEntry.url) {
    await chrome.tabs.update(nextTab.id, { url: nextEntry.url });
  }

  await chrome.storage.local.set({
    urlListConfig: { ...config, lastActiveIndex: nextIndex },
  });

  await recordTabSwitch(nextTab.id, nextEntry.label ?? nextEntry.url, enabledEntries.length);

  const globalDelay = data.delayTime ?? 5000;
  const nextDelay = nextEntry.delayMs ?? globalDelay;

  try {
    await notifyKioskOverlayOfSwitch(
      nextTab.id,
      nextEntry.url,
      nextEntry.label ?? nextEntry.url,
      nextDelay
    );
  } catch {
    // Non-fatal
  }

  await chrome.alarms.create(URL_LIST_ALARM_NAME, { delayInMinutes: nextDelay / 60000 });

  await logger.info('UrlListManager', 'Advanced to next URL', {
    index: nextIndex,
    url: nextEntry.url,
    nextDelayMs: nextDelay,
  });
}

/**
 * Stop URL list rotation. Optionally closes the managed window.
 */
export async function stopUrlListRotation(closeWindow = false): Promise<void> {
  await chrome.alarms.clear(URL_LIST_ALARM_NAME);

  if (closeWindow) {
    const data = await chrome.storage.local.get('urlListConfig') as StorageData;
    const windowId = data.urlListConfig?.windowId;
    if (windowId) {
      try {
        await chrome.windows.remove(windowId);
      } catch {
        // Window already closed
      }
    }
  }

  const data = await chrome.storage.local.get('urlListConfig') as StorageData;
  if (data.urlListConfig) {
    await chrome.storage.local.set({
      urlListConfig: { ...data.urlListConfig, windowId: undefined },
    });
  }

  await updateBadge(false);
  await logger.info('UrlListManager', 'Stopped URL list rotation');
}

/**
 * Get the list of enabled URL entries from storage.
 */
export async function getUrlListEntries(): Promise<UrlListEntry[]> {
  const data = await chrome.storage.local.get('urlListConfig') as StorageData;
  return data.urlListConfig?.entries ?? [];
}

/**
 * Save URL list entries to storage (with cap enforcement).
 */
export async function saveUrlListEntries(entries: UrlListEntry[]): Promise<void> {
  const capped = entries.slice(0, MAX_URL_LIST_ENTRIES);
  const data = await chrome.storage.local.get('urlListConfig') as StorageData;
  const config: UrlListConfig = data.urlListConfig ?? { entries: [] };
  config.entries = capped;
  await chrome.storage.local.set({ urlListConfig: config });
}
