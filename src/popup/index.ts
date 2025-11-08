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
  modeValue = document.getElementById('modeValue')!;
  intervalValue = document.getElementById('intervalValue')!;
  settingsButton = document.getElementById('settingsButton') as HTMLButtonElement;

  // Set up event listeners
  toggleButton.addEventListener('click', handleToggle);
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
  startCountdownTimer();
}

/**
 * Update the entire UI based on current settings
 */
async function updateUI(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'enabled',
      'windowMode',
      'delayTime',
      'pauseOnActivity',
    ]) as StorageData;

    const enabled = data.enabled ?? false;
    const windowMode = data.windowMode ?? 'global';
    const delayTime = data.delayTime ?? 60000;
    switchIntervalMs = delayTime;

    // Check if paused
    const paused = enabled && (await isPaused());

    // Update state classes and content
    updateState(enabled, paused);

    // Update info rows
    updateInfoRows(windowMode, delayTime);

    // Update toggle button
    updateToggleButton(enabled);
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
function updateInfoRows(windowMode: string, delayTime: number): void {
  // Update mode
  if (windowMode === 'current-window') {
    modeValue.textContent = 'Current Window';
  } else {
    modeValue.textContent = 'Global';
  }

  // Update interval
  const seconds = Math.round(delayTime / 1000);
  intervalValue.textContent = `${seconds} seconds`;
}

/**
 * Update toggle button text and style
 */
function updateToggleButton(enabled: boolean): void {
  toggleButton.classList.remove('enable', 'disable');

  if (enabled) {
    toggleButton.textContent = 'Disable Auto-Switch';
    toggleButton.classList.add('disable');
  } else {
    toggleButton.textContent = 'Enable Auto-Switch';
    toggleButton.classList.add('enable');
  }
}

/**
 * Handle toggle button click
 */
async function handleToggle(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['enabled']) as StorageData;
    const currentlyEnabled = data.enabled ?? false;

    // Toggle the enabled state
    await chrome.storage.local.set({ enabled: !currentlyEnabled });

    // UI will update via storage change listener
  } catch (error) {
    console.error('Error toggling auto-switch:', error);
  }
}

/**
 * Open settings page
 */
function openSettings(): void {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup/settings.html')
  });
}

/**
 * Start countdown timer that updates every second
 */
function startCountdownTimer(): void {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Estimate next switch time (approximate)
  nextSwitchTime = Date.now() + switchIntervalMs;

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
    const data = await chrome.storage.local.get(['enabled']) as StorageData;
    const enabled = data.enabled ?? false;

    if (!enabled) {
      countdownNumber.textContent = '--';
      return;
    }

    // Calculate time remaining (approximate)
    const now = Date.now();
    let remaining = Math.max(0, Math.ceil((nextSwitchTime - now) / 1000));

    // If we've passed the switch time, reset
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
