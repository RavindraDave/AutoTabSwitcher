/**
 * Auto Tab Switcher - Compact Popup Controller
 *
 * This is the main popup that appears when clicking the extension icon.
 * Provides quick status view and toggle control.
 */

import { StorageData } from '../core/types.js';
import { isPaused } from '../core/activity-tracker.js';
import { getMinDelayMs, getSwitchingMode } from '../core/storage.js';
import { logger } from '../core/logger.js';

// DOM Elements
let header: HTMLElement;
let statusBadge: HTMLElement;
let statusCard: HTMLElement;
let statusIcon: HTMLElement;
let countdownRing: HTMLElement;
let countdownCircle: HTMLElement;
let countdownNumber: HTMLElement;
let countdownLabel: HTMLElement;
let pulse: HTMLElement;
let statusText: HTMLElement;
let toggleButton: HTMLButtonElement;
let modeGlobalBtn: HTMLButtonElement;
let modeWindowBtn: HTMLButtonElement;
let modeValue: HTMLElement;
let intervalValue: HTMLElement;
let settingsButton: HTMLButtonElement;

// State
let countdownInterval: number | undefined;
let nextSwitchTime: number = 0;
let switchIntervalMs: number = getMinDelayMs(); // Use environment-specific minimum as initial value

/**
 * Initialize the popup
 */
/**
 * Initialize popup
 */
export async function initializePopup(): Promise<void> {
  // Get DOM elements
  header = document.getElementById('header')!;
  statusBadge = document.getElementById('statusBadge')!;
  statusCard = document.getElementById('statusCard')!;
  statusIcon = document.getElementById('statusIcon')!;
  countdownRing = document.getElementById('countdownRing')!;
  countdownCircle = document.getElementById('countdownCircle')!;
  countdownNumber = document.getElementById('countdownNumber')!;
  countdownLabel = document.getElementById('countdownLabel')!;
  pulse = document.getElementById('pulse')!;
  statusText = document.getElementById('statusText')!;
  toggleButton = document.getElementById('toggleButton') as HTMLButtonElement;
  modeGlobalBtn = document.getElementById('modeGlobalBtn') as HTMLButtonElement;
  modeWindowBtn = document.getElementById('modeWindowBtn') as HTMLButtonElement;
  modeValue = document.getElementById('modeValue')!;
  intervalValue = document.getElementById('intervalValue')!;
  settingsButton = document.getElementById('settingsButton') as HTMLButtonElement;

  // Set up event listeners
  toggleButton.addEventListener('click', handleToggle);
  modeGlobalBtn.addEventListener('click', () => handleModeSwitch('global'));
  modeWindowBtn.addEventListener('click', () => handleModeSwitch('window'));
  settingsButton.addEventListener('click', openSettings);

  // Listen for storage changes
  chrome.storage.onChanged.addListener((_changes, namespace) => {
    if (namespace === 'local') {
      updateUI();
    }
  });

  // Initial UI update
  await updateUI();

  // Start countdown timer
  await startCountdownTimer();
}

/**
 * Update the entire UI based on current settings
 */
async function updateUI(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'enabled',
      'switchingMode',
      'operatingMode',
      'windowMode', // Legacy fallback
      'windowStates',
      'delayTime',
      'pauseOnActivity',
    ]) as StorageData;

    // Get switching mode with backward compatibility
    const switchingMode = getSwitchingMode(data);

    const delayTime = data.delayTime ?? getMinDelayMs(); // Fallback to environment-specific minimum
    switchIntervalMs = delayTime;

    // Get current window
    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    // Determine if current window is enabled
    let isCurrentWindowEnabled = false;
    if (switchingMode === 'global') {
      // In global mode, use the global enabled state
      isCurrentWindowEnabled = data.enabled ?? false;
    } else {
      // In window mode, check if current window is enabled
      const windowStates = data.windowStates ?? {};
      isCurrentWindowEnabled = windowStates[currentWindowId]?.enabled ?? false;
    }

    // Check if paused
    const paused = isCurrentWindowEnabled && (await isPaused());

    // Update state classes and content
    updateState(isCurrentWindowEnabled, paused);

    // Update info rows
    updateInfoRows(switchingMode, delayTime);

    // Update toggle button
    updateToggleButton(isCurrentWindowEnabled, switchingMode);

    // Update segmented control state
    updateSegmentedControl(switchingMode);

    // Apply visual theme
    applyTheme(switchingMode);
  } catch (error) {
    await logger.error('PopupIndex', 'Error updating UI', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update state-dependent UI elements
 */
function updateState(enabled: boolean, paused: boolean): void {
  // Remove all state classes
  header.classList.remove('active', 'paused', 'inactive');
  statusCard.classList.remove('active', 'paused', 'inactive');

  if (!enabled) {
    // Disabled state
    header.classList.add('inactive');
    statusCard.classList.add('inactive');
    statusBadge.textContent = 'DISABLED';
    statusIcon.textContent = '⏹️';
    statusText.textContent = 'Auto-switching disabled';
    countdownRing.classList.add('hidden');
  } else if (paused) {
    // Paused state
    header.classList.add('paused');
    statusCard.classList.add('paused');
    statusBadge.textContent = 'PAUSED';
    statusIcon.textContent = '⏸️';
    statusText.textContent = 'Paused due to activity';
    countdownRing.classList.remove('hidden');
    countdownLabel.textContent = 'resuming';
    countdownCircle.style.stroke = 'url(#gradient-paused)';
    pulse.style.display = 'none';
  } else {
    // Active state
    header.classList.add('active');
    statusCard.classList.add('active');
    statusBadge.textContent = 'ACTIVE';
    statusIcon.textContent = '🔄';
    statusText.textContent = 'Auto-switching enabled';
    countdownRing.classList.remove('hidden');
    countdownLabel.textContent = 'seconds';
    // Gradient URL will be updated by applyTheme
    // countdownCircle.style.stroke = 'url(#gradient-active)';
    pulse.style.display = 'block';
  }
}

/**
 * Update info rows (mode and interval)
 */
function updateInfoRows(switchingMode: string, delayTime: number): void {
  // Update mode
  if (switchingMode === 'window') {
    modeValue.textContent = 'Window Mode';
  } else {
    modeValue.textContent = 'Global Mode';
  }

  // Update interval
  const seconds = Math.round(delayTime / 1000);
  intervalValue.textContent = `${seconds} seconds`;
}

/**
 * Update toggle button text and style
 */
function updateToggleButton(
  isCurrentWindowEnabled: boolean,
  switchingMode: string
): void {
  toggleButton.classList.remove('enable', 'disable');

  if (isCurrentWindowEnabled) {
    if (switchingMode === 'window') {
      toggleButton.textContent = 'Disable This Window';
    } else {
      toggleButton.textContent = 'Disable All Windows';
    }
    toggleButton.classList.add('disable');
  } else {
    if (switchingMode === 'window') {
      toggleButton.textContent = 'Enable This Window';
    } else {
      toggleButton.textContent = 'Enable All Windows';
    }
    toggleButton.classList.add('enable');
  }
}

/**
 * Update segmented control UI state
 */
function updateSegmentedControl(switchingMode: string): void {
  if (switchingMode === 'window') {
    modeGlobalBtn.classList.remove('active');
    modeWindowBtn.classList.add('active');
  } else {
    modeGlobalBtn.classList.add('active');
    modeWindowBtn.classList.remove('active');
  }
}

/**
 * Apply visual theme based on mode
 */
function applyTheme(switchingMode: string): void {
  if (switchingMode === 'window') {
    document.body.classList.add('window-mode');
    // Update countdown circle gradient if active
    if (header.classList.contains('active')) {
      countdownCircle.style.stroke = 'url(#gradient-active-window)';
    }
  } else {
    document.body.classList.remove('window-mode');
    // Update countdown circle gradient if active
    if (header.classList.contains('active')) {
      countdownCircle.style.stroke = 'url(#gradient-active)';
    }
  }
}

/**
 * Handle mode switching via Segmented Control
 */
async function handleModeSwitch(targetMode: 'global' | 'window'): Promise<void> {
  try {
    if (targetMode === 'window') {
      // Switch to Window Mode
      const currentWindow = await chrome.windows.getCurrent();
      const currentWindowId = currentWindow.id;

      if (currentWindowId === undefined) {
        await logger.error('PopupIndex', 'Could not get current window ID (window mode switch)');
        return;
      }

      // Get current states
      const data = await chrome.storage.local.get(['windowStates', 'enabled']) as StorageData;
      const windowStates = data.windowStates ?? {};
      const wasGloballyEnabled = data.enabled ?? false;

      // Get all windows
      const allWindows = await chrome.windows.getAll();

      // Disable ALL windows first
      for (const window of allWindows) {
        if (window.id !== undefined) {
          windowStates[window.id] = {
            enabled: false,
            enabledTimestamp: undefined,
            lastSwitchTime: windowStates[window.id]?.lastSwitchTime ?? Date.now(),
          };
        }
      }

      // Only enable current window if it was previously enabled in global mode
      if (wasGloballyEnabled) {
        windowStates[currentWindowId] = {
          enabled: true,
          enabledTimestamp: Date.now(),
          lastSwitchTime: Date.now(),
        };
      }

      await chrome.storage.local.set({
        switchingMode: 'window',
        operatingMode: 'window', // DEPRECATED: Kept for backward compatibility
        windowStates,
      });
    } else {
      // Switch to Global Mode
      const currentWindow = await chrome.windows.getCurrent();
      const currentWindowId = currentWindow.id;

      if (currentWindowId === undefined) {
        await logger.error('PopupIndex', 'Could not get current window ID (global mode switch)');
        return;
      }

      // Get current window state to preserve enabled status
      const data = await chrome.storage.local.get(['windowStates']) as StorageData;
      const windowStates = data.windowStates ?? {};
      const wasWindowEnabled = windowStates[currentWindowId]?.enabled ?? false;

      await chrome.storage.local.set({
        switchingMode: 'global',
        operatingMode: 'global', // DEPRECATED: Kept for backward compatibility
        enabled: wasWindowEnabled, // Preserve the current window's enabled state
      });
    }
  } catch (error) {
    await logger.error('PopupIndex', 'Error switching mode', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Handle toggle button click
 * In Global Mode: toggles global enabled state
 * In Window Mode: toggles current window's enabled state
 */
export async function handleToggle(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'switchingMode',
      'operatingMode',
      'windowMode', // Legacy fallback
      'enabled',
      'windowStates',
    ]) as StorageData;

    // Get switching mode with backward compatibility
    const switchingMode = getSwitchingMode(data);

    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    if (switchingMode === 'global') {
      // Global mode: toggle global enabled state
      const currentlyEnabled = data.enabled ?? false;
      const updates: any = { enabled: !currentlyEnabled };

      // BUGFIX: When enabling Global mode, initialize lastSwitchTimes for proper countdown
      // and ensure switchingMode is explicitly set to prevent any confusion
      if (!currentlyEnabled) {
        const lastSwitchTimes = (await chrome.storage.local.get(['lastSwitchTimes']) as any).lastSwitchTimes || {};
        lastSwitchTimes[currentWindowId] = Date.now();
        updates.lastSwitchTimes = lastSwitchTimes;

        // BUGFIX: Explicitly set switchingMode to 'global' to ensure proper initialization
        // This prevents any race conditions or undefined state issues on fresh install
        updates.switchingMode = 'global';
        updates.operatingMode = 'global'; // DEPRECATED: Kept for backward compatibility

        await logger.info('PopupIndex', 'Initializing Global mode with lastSwitchTimes');
      }

      await chrome.storage.local.set(updates);
    } else {
      // Window mode: toggle current window's state
      const windowStates = data.windowStates ?? {};
      const currentWindowState = windowStates[currentWindowId];
      const isCurrentlyEnabled = currentWindowState?.enabled ?? false;

      windowStates[currentWindowId] = {
        enabled: !isCurrentlyEnabled,
        enabledTimestamp: !isCurrentlyEnabled ? Date.now() : undefined,
        // BUGFIX: Always use Date.now() when enabling to start timer fresh
        // When disabling, preserve old value for consistency (though it's unused)
        lastSwitchTime: !isCurrentlyEnabled ? Date.now() : (currentWindowState?.lastSwitchTime ?? Date.now()),
      };

      await chrome.storage.local.set({ windowStates });
    }

    // UI will update via storage change listener
  } catch (error) {
    await logger.error('PopupIndex', 'Error toggling auto-switch', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Open settings page
 */
function openSettings(): void {
  chrome.runtime.openOptionsPage();
}

/**
 * Start countdown timer that updates every second
 */
async function startCountdownTimer(): Promise<void> {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Get switching mode and determine which window's timing to show
  const data = await chrome.storage.local.get([
    'switchingMode',
    'operatingMode',
    'windowMode', // Legacy fallback
    'windowStates',
    'lastSwitchTimes',
    'lastSwitchTime', // deprecated fallback
  ]) as StorageData;

  // Get switching mode with backward compatibility
  const switchingMode = getSwitchingMode(data);

  // Always show timing for the current window
  const currentWindow = await chrome.windows.getCurrent();
  const targetWindowId = currentWindow.id!;

  let lastSwitchTime: number | undefined;

  if (switchingMode === 'window') {
    // In window mode, get this window's last switch time from windowStates
    const windowStates = data.windowStates ?? {};
    lastSwitchTime = windowStates[targetWindowId]?.lastSwitchTime;
  } else {
    // In global mode, use per-window or global last switch time
    if (targetWindowId !== undefined && data.lastSwitchTimes) {
      lastSwitchTime = data.lastSwitchTimes[targetWindowId];
    } else if (data.lastSwitchTime) {
      lastSwitchTime = data.lastSwitchTime;
    }
  }

  if (lastSwitchTime) {
    // Calculate when the next switch should happen based on the last switch
    nextSwitchTime = lastSwitchTime + switchIntervalMs;

    // If we're already past the next switch time, use current time + interval
    if (nextSwitchTime < Date.now()) {
      nextSwitchTime = Date.now() + switchIntervalMs;
    }
  } else {
    // No previous switch recorded, estimate based on current time
    nextSwitchTime = Date.now() + switchIntervalMs;
  }

  // Update countdown every second
  countdownInterval = setInterval(() => {
    updateCountdown();
  }, 1000) as unknown as number;

  // Initial update
  updateCountdown();
}

/**
 * Update countdown display
 */
async function updateCountdown(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'enabled',
      'switchingMode',
      'operatingMode',
      'windowMode', // Legacy fallback
      'windowStates',
      'lastSwitchTimes',
      'lastSwitchTime', // deprecated fallback
    ]) as StorageData;

    // Get switching mode with backward compatibility
    const switchingMode = getSwitchingMode(data);

    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    // Check if current window is enabled
    let isEnabled = false;
    if (switchingMode === 'global') {
      isEnabled = data.enabled ?? false;
    } else {
      const windowStates = data.windowStates ?? {};
      isEnabled = windowStates[currentWindowId]?.enabled ?? false;
    }

    if (!isEnabled) {
      countdownNumber.textContent = '--';
      return;
    }

    const now = Date.now();

    // Get last switch time
    let lastSwitchTime: number | undefined;

    if (switchingMode === 'window') {
      const windowStates = data.windowStates ?? {};
      lastSwitchTime = windowStates[currentWindowId]?.lastSwitchTime;
    } else {
      if (data.lastSwitchTimes) {
        lastSwitchTime = data.lastSwitchTimes[currentWindowId];
      } else if (data.lastSwitchTime) {
        lastSwitchTime = data.lastSwitchTime;
      }
    }

    // Recalculate next switch time if we have a lastSwitchTime
    // This ensures accuracy when tabs are switched in background
    if (lastSwitchTime) {
      // Calculate when the next switch should occur
      let calculatedNextSwitch = lastSwitchTime + switchIntervalMs;

      // If the calculated time is in the past, find the next future switch time
      // by adding intervals until we're in the future
      while (calculatedNextSwitch <= now) {
        calculatedNextSwitch += switchIntervalMs;
      }

      // If our stored nextSwitchTime differs significantly, update it
      if (Math.abs(nextSwitchTime - calculatedNextSwitch) > 2000) {
        nextSwitchTime = calculatedNextSwitch;
      }
    }

    // Calculate time remaining
    let remaining = Math.max(0, Math.ceil((nextSwitchTime - now) / 1000));

    // If we've passed the switch time, the tab should have switched
    // Update nextSwitchTime for the next cycle
    if (remaining === 0) {
      nextSwitchTime = now + switchIntervalMs;
      remaining = Math.ceil(switchIntervalMs / 1000);
    }

    // Update countdown number
    countdownNumber.textContent = String(remaining);

    // Update SVG circle progress
    const circumference = 2 * Math.PI * 36; // radius is 36
    const progress = remaining / (switchIntervalMs / 1000);
    const offset = circumference * (1 - progress);
    countdownCircle.style.strokeDashoffset = String(offset);
  } catch (error) {
    await logger.error('PopupIndex', 'Error updating countdown', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
