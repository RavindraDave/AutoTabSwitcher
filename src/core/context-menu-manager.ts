/**
 * Context Menu Manager
 *
 * Provides right-click context menu integration for quick actions:
 * - Exclude current tab from rotation
 * - Pause/Resume auto-switching
 * - Enable/Disable for current window (in Window Mode)
 *
 * Uses chrome.contextMenus API.
 */

import { logger } from './logger.js';
import {
  getSettings,
  getSwitchingMode,
  getContextMenuEnabled,
} from './storage.js';
import {
  CONTEXT_MENU_ID_PARENT,
  CONTEXT_MENU_ID_EXCLUDE,
  CONTEXT_MENU_ID_TOGGLE,
  CONTEXT_MENU_ID_SET_TAB_DELAY,
} from './constants.js';
import { isUrlEligibleForPerTabDelay } from './url-normalizer.js';

const CONTEXT_MENU_ID_TOGGLE_WINDOW = 'ats-toggle-window';

/**
 * Initialize context menus. Should be called on extension install/update.
 */
export async function initializeContextMenus(): Promise<void> {
  const enabled = await getContextMenuEnabled();

  if (!enabled) {
    await removeAllContextMenus();
    await logger.info('ContextMenu', 'Context menus disabled');
    return;
  }

  await createContextMenus();
  await logger.info('ContextMenu', 'Context menus initialized');
}

/**
 * Create the context menu items.
 */
async function createContextMenus(): Promise<void> {
  // Remove existing menus first to avoid duplicates
  await removeAllContextMenus();

  try {
    // Parent menu
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_PARENT,
      title: 'Auto Tab Switcher',
      contexts: ['page'],
    });

    // Toggle cycling on/off
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_TOGGLE,
      parentId: CONTEXT_MENU_ID_PARENT,
      title: 'Pause/Resume Cycling',
      contexts: ['page'],
    });

    // Toggle for current window (Window Mode)
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_TOGGLE_WINDOW,
      parentId: CONTEXT_MENU_ID_PARENT,
      title: 'Toggle This Window',
      contexts: ['page'],
    });

    // Exclude current tab
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_EXCLUDE,
      parentId: CONTEXT_MENU_ID_PARENT,
      title: 'Exclude This Tab from Rotation',
      contexts: ['page'],
    });

    // Set custom display time for current tab (Phase 1.1)
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_SET_TAB_DELAY,
      parentId: CONTEXT_MENU_ID_PARENT,
      title: 'Set Custom Rotation Time for This Tab…',
      contexts: ['page'],
    });

    await logger.info('ContextMenu', 'Context menu items created');
  } catch (error) {
    await logger.error('ContextMenu', 'Failed to create context menus', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove all context menus.
 */
async function removeAllContextMenus(): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      resolve();
    });
  });
}

/**
 * Handle context menu item click.
 * Should be set up as a listener in background.ts.
 */
export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  try {
    switch (info.menuItemId) {
      case CONTEXT_MENU_ID_TOGGLE:
        await handleToggleCycling();
        break;

      case CONTEXT_MENU_ID_TOGGLE_WINDOW:
        await handleToggleWindow(tab);
        break;

      case CONTEXT_MENU_ID_EXCLUDE:
        await handleExcludeTab(tab);
        break;

      case CONTEXT_MENU_ID_SET_TAB_DELAY:
        await handleSetTabDelay(tab);
        break;

      default:
        break;
    }
  } catch (error) {
    await logger.error('ContextMenu', 'Error handling menu click', {
      error: error instanceof Error ? error.message : String(error),
      menuItemId: String(info.menuItemId),
    });
  }
}

/**
 * Toggle cycling on/off via context menu.
 */
async function handleToggleCycling(): Promise<void> {
  const data = await getSettings(['enabled', 'switchingMode', 'operatingMode']);
  const switchingMode = getSwitchingMode(data);

  if (switchingMode === 'global') {
    const newEnabled = !(data.enabled ?? false);
    await chrome.storage.local.set({ enabled: newEnabled });
    await logger.info('ContextMenu', `Cycling ${newEnabled ? 'enabled' : 'disabled'} via context menu`);
  } else {
    // In window mode, toggle all windows
    const data2 = await getSettings(['windowStates']);
    const windowStates = data2.windowStates || {};
    const anyEnabled = Object.values(windowStates).some(s => s.enabled);

    for (const windowId of Object.keys(windowStates)) {
      const state = windowStates[Number(windowId)];
      if (state) {
        state.enabled = !anyEnabled;
        if (!anyEnabled) {
          state.enabledTimestamp = Date.now();
          state.lastSwitchTime = Date.now();
        }
      }
    }

    await chrome.storage.local.set({ windowStates });
    await logger.info('ContextMenu', `All windows ${!anyEnabled ? 'enabled' : 'disabled'} via context menu`);
  }
}

/**
 * Toggle cycling for the current window (Window Mode).
 */
async function handleToggleWindow(tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.windowId) {
    await logger.warn('ContextMenu', 'No window ID available for toggle');
    return;
  }

  const windowId = tab.windowId;
  const data = await getSettings(['switchingMode', 'operatingMode', 'windowStates']);
  const switchingMode = getSwitchingMode(data);

  if (switchingMode === 'global') {
    // In global mode, just toggle the global enabled state
    const enabled = !(data.enabled ?? false);
    await chrome.storage.local.set({ enabled });
    await logger.info('ContextMenu', `Global cycling ${enabled ? 'enabled' : 'disabled'} via context menu`);
  } else {
    // In window mode, toggle this specific window
    const windowStates = data.windowStates || {};
    const currentState = windowStates[windowId];
    const newEnabled = !(currentState?.enabled ?? false);

    windowStates[windowId] = {
      enabled: newEnabled,
      enabledTimestamp: newEnabled ? Date.now() : currentState?.enabledTimestamp,
      lastSwitchTime: newEnabled ? Date.now() : currentState?.lastSwitchTime,
    };

    await chrome.storage.local.set({ windowStates });
    await logger.info('ContextMenu', `Window ${windowId} ${newEnabled ? 'enabled' : 'disabled'} via context menu`);
  }
}

/**
 * Exclude the current tab from rotation by adding a skip rule.
 * Creates a URL-based skip rule for the current tab.
 */
async function handleExcludeTab(tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.url || !tab?.id) {
    await logger.warn('ContextMenu', 'No tab URL available for exclusion');
    return;
  }

  // Get existing skip rules
  const data = await chrome.storage.local.get('skipRules');
  const skipRules = data['skipRules'] || [];

  // Check if this URL is already excluded
  const alreadyExcluded = skipRules.some(
    (rule: any) => rule.type === 'url' && rule.pattern === tab.url && rule.enabled
  );

  if (alreadyExcluded) {
    await logger.info('ContextMenu', 'Tab already excluded from rotation', {
      tabId: tab.id,
    });
    return;
  }

  // Add a new skip rule for this URL
  const newRule = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type: 'url' as const,
    pattern: tab.url,
    enabled: true,
    description: `Excluded via right-click: ${tab.title || 'Unknown'}`,
    createdAt: Date.now(),
  };

  skipRules.push(newRule);
  await chrome.storage.local.set({ skipRules });

  await logger.info('ContextMenu', 'Tab excluded from rotation via context menu', {
    tabId: tab.id,
    ruleId: newRule.id,
  });
}

/**
 * Open the per-tab delay editor for the current tab (Phase 1.1).
 *
 * Service workers cannot show prompt() dialogs, so we open the React settings
 * page on the Per-Tab Delays section with the tab URL/title pre-filled via
 * URL hash parameters. The settings section reads them on mount.
 */
async function handleSetTabDelay(tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.url) {
    await logger.warn('ContextMenu', 'No tab URL available for setting delay');
    return;
  }

  if (!isUrlEligibleForPerTabDelay(tab.url)) {
    await logger.warn('ContextMenu', 'Tab URL is not eligible for a per-tab delay', {
      url: tab.url,
    });
    return;
  }

  try {
    // Hash params survive Chrome extension settings page navigation and
    // are not sent to any server. The settings page parses them on mount.
    const params = new URLSearchParams();
    params.set('addTab', tab.url);
    if (tab.title) {
      params.set('label', tab.title);
    }
    const settingsUrl = chrome.runtime.getURL(
      `settings/index.html#/general/per-tab-delays?${params.toString()}`
    );
    await chrome.tabs.create({ url: settingsUrl });

    await logger.info('ContextMenu', 'Opened per-tab delay editor', {
      tabId: tab.id,
    });
  } catch (error) {
    await logger.error('ContextMenu', 'Failed to open per-tab delay editor', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Reconfigure context menus when settings change.
 */
export async function reconfigureContextMenus(): Promise<void> {
  const enabled = await getContextMenuEnabled();

  if (enabled) {
    await createContextMenus();
  } else {
    await removeAllContextMenus();
  }
}
