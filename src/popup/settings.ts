/**
 * Auto Tab Switcher - Settings Page Controller
 *
 * Full configuration interface for the extension.
 */

import { StorageData } from '../core/types.js';
import { MIN_DELAY_SECONDS, MAX_DELAY_SECONDS, DEFAULT_PAUSE_DURATION_SECONDS } from '../core/constants.js';
import { setDelayTime } from '../core/storage.js';

// DOM Elements
let delayTimeInput: HTMLInputElement;
let radioGlobal: HTMLElement;
let radioCurrentWindow: HTMLElement;
let radioInputs: NodeListOf<HTMLInputElement>;
let windowInfo: HTMLElement;
let windowInfoText: HTMLElement;
let pauseOnActivityContainer: HTMLElement;
let pauseOnActivitySwitch: HTMLElement;
let pauseDurationSection: HTMLElement;
let pauseDurationInput: HTMLInputElement;
let errorMessage: HTMLElement;
let errorMessageText: HTMLElement;
let successMessage: HTMLElement;
let backButton: HTMLAnchorElement;
let resetButton: HTMLButtonElement;
let saveButton: HTMLButtonElement;

// State
let pauseOnActivity = false;

/**
 * Initialize settings page
 */
/**
 * Initialize settings page
 */
export async function initializeSettings(): Promise<void> {
  // Get DOM elements
  delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
  radioGlobal = document.getElementById('radioGlobal')!;
  radioCurrentWindow = document.getElementById('radioCurrentWindow')!;
  radioInputs = document.getElementsByName('windowMode') as NodeListOf<HTMLInputElement>;
  windowInfo = document.getElementById('windowInfo')!;
  windowInfoText = document.getElementById('windowInfoText')!;
  pauseOnActivityContainer = document.getElementById('pauseOnActivityContainer')!;
  pauseOnActivitySwitch = document.getElementById('pauseOnActivitySwitch')!;
  pauseDurationSection = document.getElementById('pauseDurationSection')!;
  pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;
  errorMessage = document.getElementById('errorMessage')!;
  errorMessageText = document.getElementById('errorMessageText')!;
  successMessage = document.getElementById('successMessage')!;
  backButton = document.getElementById('backButton') as HTMLAnchorElement;
  resetButton = document.getElementById('resetButton') as HTMLButtonElement;
  saveButton = document.getElementById('saveButton') as HTMLButtonElement;

  // Set up event listeners
  radioGlobal.addEventListener('click', () => selectWindowMode('global'));
  radioCurrentWindow.addEventListener('click', () => selectWindowMode('current-window'));
  radioInputs.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      selectWindowMode(target.value as 'global' | 'current-window');
    });
  });

  pauseOnActivityContainer.addEventListener('click', togglePauseOnActivity);
  backButton.addEventListener('click', handleBack);
  resetButton.addEventListener('click', resetToDefaults);
  saveButton.addEventListener('click', saveSettings);

  // Load current settings
  await loadSettings();
}

/**
 * Load settings from storage
 */
/**
 * Load settings from storage
 */
export async function loadSettings(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'delayTime',
      'windowMode',
      'selectedWindowId',
      'pauseOnActivity',
      'pauseDuration',
    ]) as StorageData;

    // Delay time
    const delayInSeconds = data.delayTime ? Math.round(data.delayTime / 1000) : MIN_DELAY_SECONDS;
    if (delayTimeInput) delayTimeInput.value = String(delayInSeconds);

    // Window mode
    const windowMode = data.windowMode ?? 'global';
    selectWindowMode(windowMode);

    if (windowMode === 'current-window' && data.selectedWindowId) {
      await updateWindowInfo(data.selectedWindowId);
    }

    // Pause on activity
    pauseOnActivity = data.pauseOnActivity ?? false;
    updatePauseOnActivitySwitch();

    // Pause duration
    const pauseDurationInSeconds = data.pauseDuration
      ? Math.round(data.pauseDuration / 1000)
      : DEFAULT_PAUSE_DURATION_SECONDS;
    if (pauseDurationInput) pauseDurationInput.value = String(pauseDurationInSeconds);
  } catch (error) {
    console.error('Error loading settings:', error);
    showError('Failed to load settings');
  }
}

/**
 * Select window mode
 */
export function selectWindowMode(mode: 'global' | 'current-window'): void {
  // Update UI
  if (radioGlobal) radioGlobal.classList.remove('selected');
  if (radioCurrentWindow) radioCurrentWindow.classList.remove('selected');

  if (mode === 'global') {
    if (radioGlobal) radioGlobal.classList.add('selected');
    if (radioInputs && radioInputs[0]) (radioInputs[0] as HTMLInputElement).checked = true;
    if (windowInfo) windowInfo.style.display = 'none';
  } else {
    if (radioCurrentWindow) radioCurrentWindow.classList.add('selected');
    if (radioInputs && radioInputs[1]) (radioInputs[1] as HTMLInputElement).checked = true;
    // Show window info
    chrome.windows.getCurrent().then(win => {
      if (win.id) {
        updateWindowInfo(win.id);
      }
    });
  }
}

/**
 * Update window info display
 */
async function updateWindowInfo(windowId: number): Promise<void> {
  try {
    const win = await chrome.windows.get(windowId, { populate: true });
    const tabCount = win.tabs ? win.tabs.length : 0;

    if (windowInfoText) {
      windowInfoText.innerHTML = `
        <strong>Current window:</strong> Window ${windowId} (${tabCount} tabs)<br>
        Auto-switching will only affect tabs in this window.
      `;
    }
    if (windowInfo) windowInfo.style.display = 'block';
  } catch (error) {
    console.error('Error getting window info:', error);
    if (windowInfo) windowInfo.style.display = 'none';
  }
}

/**
 * Toggle pause on activity
 */
function togglePauseOnActivity(): void {
  pauseOnActivity = !pauseOnActivity;
  updatePauseOnActivitySwitch();
}

/**
 * Update pause on activity switch UI
 */
function updatePauseOnActivitySwitch(): void {
  if (pauseOnActivity) {
    if (pauseOnActivitySwitch) pauseOnActivitySwitch.classList.add('on');
    if (pauseDurationSection) pauseDurationSection.classList.remove('hidden');
  } else {
    if (pauseOnActivitySwitch) pauseOnActivitySwitch.classList.remove('on');
    if (pauseDurationSection) pauseDurationSection.classList.add('hidden');
  }
}

/**
 * Save settings
 */
export async function saveSettings(): Promise<void> {
  hideMessages();

  try {
    // Validate delay time
    const delayInSeconds = parseInt(delayTimeInput.value, 10);
    if (isNaN(delayInSeconds) || delayInSeconds < (MIN_DELAY_SECONDS || 60) || delayInSeconds > (MAX_DELAY_SECONDS || 3600)) {
      showError(`Delay time must be between ${MIN_DELAY_SECONDS || 60} and ${MAX_DELAY_SECONDS || 3600} seconds`);
      return;
    }

    // Validate pause duration if enabled
    let pauseDuration = DEFAULT_PAUSE_DURATION_SECONDS * 1000;
    if (pauseOnActivity) {
      const pauseDurationInSeconds = parseInt(pauseDurationInput.value, 10);
      if (isNaN(pauseDurationInSeconds) || pauseDurationInSeconds < 5 || pauseDurationInSeconds > 300) {
        showError('Pause duration must be between 5 and 300 seconds');
        return;
      }
      pauseDuration = pauseDurationInSeconds * 1000;
    }

    // Get window mode
    const windowMode = radioGlobal.classList.contains('selected') ? 'global' : 'current-window';

    // Check if switching from current-window to global mode
    const currentData = await chrome.storage.local.get(['windowMode', 'selectedWindowId', 'enabled']) as StorageData;
    const currentWindowMode = currentData.windowMode ?? 'global';
    const currentSelectedWindowId = currentData.selectedWindowId;
    const isCurrentlyEnabled = currentData.enabled ?? false;

    // Warn if switching from current-window to global with an active window
    if (
      currentWindowMode === 'current-window' &&
      windowMode === 'global' &&
      currentSelectedWindowId !== undefined &&
      isCurrentlyEnabled
    ) {
      const confirmed = confirm(
        `⚠️ Warning: Switching to Global mode\n\n` +
        `This will override the current window-only mode (Window ${currentSelectedWindowId}) and apply auto-switching to ALL windows.\n\n` +
        `Do you want to continue?`
      );

      if (!confirmed) {
        return; // User cancelled, don't save
      }
    }

    // Get current window ID if current-window mode
    let selectedWindowId: number | undefined;
    if (windowMode === 'current-window') {
      const currentWindow = await chrome.windows.getCurrent();
      selectedWindowId = currentWindow.id;
    }

    // Save delayTime with automatic clamping using robust helper
    const clampedDelayMs = await setDelayTime(delayInSeconds * 1000, {
      windowMode,
      selectedWindowId,
      pauseOnActivity,
      pauseDuration,
    });

    console.log('Settings saved:', {
      delayTime: clampedDelayMs,
      windowMode,
      selectedWindowId,
      pauseOnActivity,
      pauseDuration,
    });

    showSuccess();

    // Close the tab after a short delay
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Reset to default settings
 */
async function resetToDefaults(): Promise<void> {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  try {
    // Reset to defaults
    delayTimeInput.value = String(MIN_DELAY_SECONDS);
    selectWindowMode('global');
    pauseOnActivity = false;
    updatePauseOnActivitySwitch();
    pauseDurationInput.value = String(DEFAULT_PAUSE_DURATION_SECONDS);

    hideMessages();
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    showError('Failed to reset settings');
  }
}

/**
 * Handle back button
 */
function handleBack(e: Event): void {
  e.preventDefault();
  window.close();
}

/**
 * Show error message
 */
function showError(message: string): void {
  errorMessageText.textContent = message;
  errorMessage.classList.add('show');
  successMessage.classList.remove('show');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.classList.remove('show');
  }, 5000);
}

/**
 * Show success message
 */
function showSuccess(): void {
  successMessage.classList.add('show');
  errorMessage.classList.remove('show');
}

/**
 * Hide all messages
 */
function hideMessages(): void {
  errorMessage.classList.remove('show');
  successMessage.classList.remove('show');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSettings);
} else {
  initializeSettings();
}
