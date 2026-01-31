/**
 * Auto Tab Switcher - Settings Page Controller
 *
 * Full configuration interface for the extension.
 */

import { StorageData } from '../core/types.js';
import { MIN_DELAY_SECONDS, MAX_DELAY_SECONDS, DEFAULT_PAUSE_DURATION_SECONDS } from '../core/constants.js';
import { setDelayTime } from '../core/storage.js';
import { logger } from '../core/logger.js';
import { createWindowInfo, setContent } from '../utils/dom-safe.js';

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

// Modal Elements
let confirmModal: HTMLElement;
let modalTitle: HTMLElement;
let modalSubtitle: HTMLElement;
let modalMessage: HTMLElement;
let modalWarningList: HTMLElement;
let modalFooterMessage: HTMLElement;
let modalCancelBtn: HTMLButtonElement;
let modalConfirmBtn: HTMLButtonElement;

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

  // Modal elements
  confirmModal = document.getElementById('confirmModal')!;
  modalTitle = document.getElementById('modalTitle')!;
  modalSubtitle = document.getElementById('modalSubtitle')!;
  modalMessage = document.getElementById('modalMessage')!;
  modalWarningList = document.getElementById('modalWarningList')!;
  modalFooterMessage = document.getElementById('modalFooterMessage')!;
  modalCancelBtn = document.getElementById('modalCancelBtn') as HTMLButtonElement;
  modalConfirmBtn = document.getElementById('modalConfirmBtn') as HTMLButtonElement;

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
    await logger.error('PopupSettings', 'Error loading settings', {
      error: error instanceof Error ? error.message : String(error)
    });
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
      // XSS-safe: Use DOM methods instead of innerHTML
      setContent(windowInfoText, createWindowInfo(windowId, tabCount));
    }
    if (windowInfo) windowInfo.style.display = 'block';
  } catch (error) {
    await logger.error('PopupSettings', 'Error getting window info', {
      error: error instanceof Error ? error.message : String(error)
    });
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
 * Show custom confirmation modal
 * @param title - Modal title
 * @param subtitle - Modal subtitle
 * @param message - Modal message
 * @param showWarnings - Whether to show the warning list (default: false)
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
function showConfirmModal(title: string, subtitle: string, message: string, showWarnings: boolean = false): Promise<boolean> {
  return new Promise((resolve) => {
    // Set modal content
    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;
    modalMessage.textContent = message;

    // Show/hide warning list
    if (showWarnings) {
      modalWarningList.style.display = 'block';
      modalFooterMessage.style.display = 'block';
    } else {
      modalWarningList.style.display = 'none';
      modalFooterMessage.style.display = 'none';
    }

    // Show modal
    confirmModal.classList.add('show');

    // Handle confirm
    const handleConfirm = () => {
      confirmModal.classList.remove('show');
      cleanup();
      resolve(true);
    };

    // Handle cancel
    const handleCancel = () => {
      confirmModal.classList.remove('show');
      cleanup();
      resolve(false);
    };

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    // Handle click outside modal
    const handleClickOutside = (e: MouseEvent) => {
      if (e.target === confirmModal) {
        handleCancel();
      }
    };

    // Cleanup function
    const cleanup = () => {
      modalConfirmBtn.removeEventListener('click', handleConfirm);
      modalCancelBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleEscape);
      confirmModal.removeEventListener('click', handleClickOutside);
    };

    // Add event listeners
    modalConfirmBtn.addEventListener('click', handleConfirm);
    modalCancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleEscape);
    confirmModal.addEventListener('click', handleClickOutside);
  });
}

/**
 * Save settings
 */
export async function saveSettings(): Promise<void> {
  hideMessages();

  try {
    // Validate delay time
    const delayInSeconds = parseInt(delayTimeInput.value, 10);
    if (isNaN(delayInSeconds) || delayInSeconds < (MIN_DELAY_SECONDS || 2) || delayInSeconds > (MAX_DELAY_SECONDS || 3600)) {
      showError(`Delay time must be between ${MIN_DELAY_SECONDS || 2} and ${MAX_DELAY_SECONDS || 3600} seconds`);
      return;
    }

    // Warn user about very low delay times
    if (delayInSeconds < 5) {
      const confirmed = await showConfirmModal(
        `Very Low Delay Time (${delayInSeconds} seconds)`,
        'This setting may cause issues',
        `You are about to set the delay to ${delayInSeconds} seconds. Are you absolutely sure you want to continue?`,
        true // Show warnings
      );

      if (!confirmed) {
        return; // User cancelled
      }
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
      const confirmed = await showConfirmModal(
        'Switching to Global Mode',
        'This will affect all windows',
        `This will override the current window-only mode (Window ${currentSelectedWindowId}) and apply auto-switching to ALL windows. Do you want to continue?`
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

    await logger.info('PopupSettings', 'Settings saved', {
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
    await logger.error('PopupSettings', 'Error saving settings', {
      error: error instanceof Error ? error.message : String(error)
    });
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Reset to default settings
 */
async function resetToDefaults(): Promise<void> {
  const confirmed = await showConfirmModal(
    'Reset to Defaults',
    'This will reset all settings',
    'All your custom settings will be reset to their default values. This action cannot be undone. Do you want to continue?'
  );

  if (!confirmed) {
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
    await logger.error('PopupSettings', 'Error resetting to defaults', {
      error: error instanceof Error ? error.message : String(error)
    });
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
