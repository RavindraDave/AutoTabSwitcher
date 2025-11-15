/**
 * Auto Tab Switcher - Compact Popup Controller
 *
 * This is the main popup that appears when clicking the extension icon.
 * Provides quick status view and toggle control.
 */

import { StorageData } from '../core/types.js';
import { isPaused } from '../core/activity-tracker.js';

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
let advancedOptionsSection: HTMLElement;
let switchToWindowModeButton: HTMLButtonElement;
let backToGlobalSection: HTMLElement;
let backToGlobalButton: HTMLButtonElement;
let modeValue: HTMLElement;
let intervalValue: HTMLElement;
let settingsButton: HTMLButtonElement;

// State
let countdownInterval: number | undefined;
let nextSwitchTime: number = 0;
let switchIntervalMs: number = 60000;

/**
 * Initialize the popup
 */
async function initializePopup(): Promise<void> {
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
  advancedOptionsSection = document.getElementById('advancedOptionsSection')!;
  switchToWindowModeButton = document.getElementById('switchToWindowModeButton') as HTMLButtonElement;
  backToGlobalSection = document.getElementById('backToGlobalSection')!;
  backToGlobalButton = document.getElementById('backToGlobalButton') as HTMLButtonElement;
  modeValue = document.getElementById('modeValue')!;
  intervalValue = document.getElementById('intervalValue')!;
  settingsButton = document.getElementById('settingsButton') as HTMLButtonElement;

  // Set up event listeners
  toggleButton.addEventListener('click', handleToggle);
  switchToWindowModeButton.addEventListener('click', handleSwitchToWindowMode);
  backToGlobalButton.addEventListener('click', handleBackToGlobal);
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
      'operatingMode',
      'windowMode', // Legacy fallback
      'windowStates',
      'delayTime',
      'pauseOnActivity',
    ]) as StorageData;

    // Determine operating mode (with legacy fallback)
    let operatingMode = data.operatingMode ?? 'global';
    if (!data.operatingMode && data.windowMode) {
      operatingMode = data.windowMode === 'current-window' ? 'window' : 'global';
    }

    const delayTime = data.delayTime ?? 60000;
    switchIntervalMs = delayTime;

    // Get current window
    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    // Determine if current window is enabled
    let isCurrentWindowEnabled = false;
    if (operatingMode === 'global') {
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
    updateInfoRows(operatingMode, delayTime);

    // Update toggle button
    updateToggleButton(isCurrentWindowEnabled, operatingMode);

    // Update mode-specific sections (Advanced Options or Back to Global)
    updateModeSections(operatingMode);
  } catch (error) {
    console.error('Error updating UI:', error);
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
    countdownCircle.style.stroke = 'url(#gradient-active)';
    pulse.style.display = 'block';
  }
}

/**
 * Update info rows (mode and interval)
 */
function updateInfoRows(operatingMode: string, delayTime: number): void {
  // Update mode
  if (operatingMode === 'window') {
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
  operatingMode: string
): void {
  toggleButton.classList.remove('enable', 'disable');

  if (isCurrentWindowEnabled) {
    if (operatingMode === 'window') {
      toggleButton.textContent = 'Disable This Window';
    } else {
      toggleButton.textContent = 'Disable All Windows';
    }
    toggleButton.classList.add('disable');
  } else {
    if (operatingMode === 'window') {
      toggleButton.textContent = 'Enable This Window';
    } else {
      toggleButton.textContent = 'Enable All Windows';
    }
    toggleButton.classList.add('enable');
  }
}

/**
 * Update mode-specific sections visibility
 * Shows "Advanced Options" in Global Mode or "Back to Global" in Window Mode
 */
function updateModeSections(operatingMode: string): void {
  if (operatingMode === 'global') {
    // Global Mode: Show advanced options to switch to Window Mode
    advancedOptionsSection.classList.remove('hidden');
    backToGlobalSection.classList.add('hidden');
  } else {
    // Window Mode: Show back button to return to Global Mode
    advancedOptionsSection.classList.add('hidden');
    backToGlobalSection.classList.remove('hidden');
  }
}

/**
 * Handle "Switch to Window Mode" button click
 * Switches to Window Mode and enables ONLY the current window
 */
async function handleSwitchToWindowMode(): Promise<void> {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id;

    if (currentWindowId === undefined) {
      console.error('Could not get current window ID');
      return;
    }

    // Get current window states
    const data = await chrome.storage.local.get(['windowStates']) as StorageData;
    const windowStates = data.windowStates ?? {};

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

    // Then enable ONLY the current window
    windowStates[currentWindowId] = {
      enabled: true,
      enabledTimestamp: Date.now(),
      lastSwitchTime: Date.now(),
    };

    // Switch to Window Mode and save states
    await chrome.storage.local.set({
      operatingMode: 'window',
      windowStates,
    });

    console.log('Switched to Window Mode for current window:', currentWindowId);

    // UI will update via storage change listener
  } catch (error) {
    console.error('Error switching to window mode:', error);
  }
}

/**
 * Handle "Back to Global Mode" button click
 * Switches back to Global Mode and enables all windows
 */
async function handleBackToGlobal(): Promise<void> {
  try {
    // Switch back to Global Mode and enable globally
    await chrome.storage.local.set({
      operatingMode: 'global',
      enabled: true, // Enable globally
    });

    console.log('Switched back to Global Mode');

    // UI will update via storage change listener
  } catch (error) {
    console.error('Error switching back to global mode:', error);
  }
}

/**
 * Handle toggle button click
 * In Global Mode: toggles global enabled state
 * In Window Mode: toggles current window's enabled state
 */
async function handleToggle(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'operatingMode',
      'windowMode', // Legacy fallback
      'enabled',
      'windowStates',
    ]) as StorageData;

    // Determine operating mode
    let operatingMode = data.operatingMode ?? 'global';
    if (!data.operatingMode && data.windowMode) {
      operatingMode = data.windowMode === 'current-window' ? 'window' : 'global';
    }

    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    if (operatingMode === 'global') {
      // Global mode: toggle global enabled state
      const currentlyEnabled = data.enabled ?? false;
      await chrome.storage.local.set({ enabled: !currentlyEnabled });
    } else {
      // Window mode: toggle current window's state
      const windowStates = data.windowStates ?? {};
      const currentWindowState = windowStates[currentWindowId];
      const isCurrentlyEnabled = currentWindowState?.enabled ?? false;

      windowStates[currentWindowId] = {
        enabled: !isCurrentlyEnabled,
        enabledTimestamp: !isCurrentlyEnabled ? Date.now() : undefined,
        lastSwitchTime: currentWindowState?.lastSwitchTime ?? Date.now(),
      };

      await chrome.storage.local.set({ windowStates });
    }

    // UI will update via storage change listener
  } catch (error) {
    console.error('Error toggling auto-switch:', error);
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

  // Get operating mode and determine which window's timing to show
  const data = await chrome.storage.local.get([
    'operatingMode',
    'windowMode', // Legacy fallback
    'windowStates',
    'lastSwitchTimes',
    'lastSwitchTime', // deprecated fallback
  ]) as StorageData;

  // Determine operating mode
  let operatingMode = data.operatingMode ?? 'global';
  if (!data.operatingMode && data.windowMode) {
    operatingMode = data.windowMode === 'current-window' ? 'window' : 'global';
  }

  // Always show timing for the current window
  const currentWindow = await chrome.windows.getCurrent();
  const targetWindowId = currentWindow.id!;

  let lastSwitchTime: number | undefined;

  if (operatingMode === 'window') {
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
      'operatingMode',
      'windowMode', // Legacy fallback
      'windowStates',
      'lastSwitchTimes',
      'lastSwitchTime', // deprecated fallback
    ]) as StorageData;

    // Determine operating mode
    let operatingMode = data.operatingMode ?? 'global';
    if (!data.operatingMode && data.windowMode) {
      operatingMode = data.windowMode === 'current-window' ? 'window' : 'global';
    }

    const currentWindow = await chrome.windows.getCurrent();
    const currentWindowId = currentWindow.id!;

    // Check if current window is enabled
    let isEnabled = false;
    if (operatingMode === 'global') {
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

    if (operatingMode === 'window') {
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
      const calculatedNextSwitch = lastSwitchTime + switchIntervalMs;

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
    console.error('Error updating countdown:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
