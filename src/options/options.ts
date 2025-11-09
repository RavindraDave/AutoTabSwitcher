/**
 * Auto Tab Switcher - Options Page Controller
 *
 * Handles the extension options page interface for configuring all settings.
 */

import { isPacked } from '../utils/environment.js';
import {
  MIN_DELAY_SECONDS,
  MAX_DELAY_SECONDS,
  MIN_PAUSE_DURATION_SECONDS,
  MAX_PAUSE_DURATION_SECONDS,
  DEFAULT_PAUSE_DURATION_SECONDS,
  MIN_DELAY_MS_PRODUCTION,
} from '../core/constants.js';
import { StorageData } from '../core/types.js';
import { validateDelayTime, validatePauseDuration } from '../popup/shared/validation.js';

// Determine minimum delay based on environment
const MIN_DELAY_SECONDS_ENV = isPacked()
  ? MIN_DELAY_MS_PRODUCTION / 1000
  : MIN_DELAY_SECONDS;
const DEFAULT_DELAY_SECONDS = MIN_DELAY_SECONDS_ENV;

/**
 * Show success message
 */
function showSuccess(message: string): void {
  const successAlert = document.getElementById('successAlert');
  const successMessage = document.getElementById('successMessage');
  if (successAlert && successMessage) {
    successMessage.textContent = message;
    successAlert.style.display = 'block';
    setTimeout(() => {
      successAlert.style.display = 'none';
    }, 3000);
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  if (errorAlert && errorMessage) {
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
      errorAlert.style.display = 'none';
    }, 5000);
  }
}

/**
 * Show environment information
 */
function showEnvironmentInfo(): void {
  const infoEl = document.getElementById('environmentInfo');
  const minDelayLabel = document.getElementById('minDelayLabel');

  if (infoEl) {
    const environment = isPacked() ? 'Production' : 'Development';
    const minDelay = MIN_DELAY_SECONDS_ENV;

    infoEl.innerHTML = `
      <div class="alert alert-info mt-2" style="font-size: 0.9rem;">
        <strong>${environment} Mode</strong><br>
        Minimum delay: ${minDelay} seconds
        ${!isPacked() ? '<br><small>Production version allows 5-second minimum</small>' : ''}
      </div>
    `;
  }

  if (minDelayLabel) {
    minDelayLabel.textContent = String(MIN_DELAY_SECONDS_ENV);
  }
}

/**
 * Load all windows and populate the window select dropdown
 */
async function loadWindows(): Promise<void> {
  try {
    const windows = await chrome.windows.getAll({ populate: false });
    const windowSelect = document.getElementById('windowSelect') as HTMLSelectElement;

    if (!windowSelect) {
      return;
    }

    // Clear existing options
    windowSelect.innerHTML = '';

    // Add windows to dropdown
    windows.forEach((window, index) => {
      const option = document.createElement('option');
      option.value = String(window.id);
      option.textContent = `Window ${index + 1} (ID: ${window.id})`;
      windowSelect.appendChild(option);
    });

    // Get currently selected window
    const data = (await chrome.storage.local.get(['selectedWindowId'])) as StorageData;
    if (data.selectedWindowId) {
      windowSelect.value = String(data.selectedWindowId);
    }
  } catch (error) {
    console.error('Error loading windows:', error);
  }
}

/**
 * Handle window mode radio change
 */
function handleWindowModeChange(mode: 'global' | 'current-window'): void {
  const windowSelectContainer = document.getElementById('windowSelectContainer');

  if (windowSelectContainer) {
    if (mode === 'current-window') {
      windowSelectContainer.style.display = 'block';
      loadWindows();
    } else {
      windowSelectContainer.style.display = 'none';
    }
  }
}

/**
 * Handle pause on activity checkbox change
 */
function handlePauseOnActivityChange(checked: boolean): void {
  const pauseOptionsContainer = document.getElementById('pauseOptionsContainer');

  if (pauseOptionsContainer) {
    pauseOptionsContainer.style.display = checked ? 'block' : 'none';
  }
}

/**
 * Load all settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const data = (await chrome.storage.local.get([
      'delayTime',
      'enabled',
      'windowMode',
      'selectedWindowId',
      'pauseOnActivity',
      'pauseDuration',
      'enableOnStartup',
    ])) as StorageData;

    // Default delay time
    const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
    const delayInSeconds = data.delayTime
      ? Math.round(data.delayTime / 1000)
      : DEFAULT_DELAY_SECONDS;
    if (defaultDelayInput) {
      defaultDelayInput.value = String(delayInSeconds);
      defaultDelayInput.min = String(MIN_DELAY_SECONDS_ENV);
      defaultDelayInput.max = String(MAX_DELAY_SECONDS);
    }

    // Enable on startup
    const enableOnStartupCheckbox = document.getElementById(
      'enableOnStartupCheckbox'
    ) as HTMLInputElement;
    if (enableOnStartupCheckbox) {
      enableOnStartupCheckbox.checked = data.enableOnStartup ?? false;
    }

    // Window mode
    const windowMode = data.windowMode ?? 'global';
    const windowModeGlobal = document.getElementById('windowModeGlobal') as HTMLInputElement;
    const windowModeCurrentWindow = document.getElementById(
      'windowModeCurrentWindow'
    ) as HTMLInputElement;

    if (windowMode === 'global' && windowModeGlobal) {
      windowModeGlobal.checked = true;
    } else if (windowMode === 'current-window' && windowModeCurrentWindow) {
      windowModeCurrentWindow.checked = true;
      await loadWindows();
      const windowSelectContainer = document.getElementById('windowSelectContainer');
      if (windowSelectContainer) {
        windowSelectContainer.style.display = 'block';
      }
    }

    // Pause on activity
    const pauseOnActivityCheckbox = document.getElementById(
      'pauseOnActivityCheckbox'
    ) as HTMLInputElement;
    const pauseOnActivity = data.pauseOnActivity ?? false;
    if (pauseOnActivityCheckbox) {
      pauseOnActivityCheckbox.checked = pauseOnActivity;
      handlePauseOnActivityChange(pauseOnActivity);
    }

    // Pause duration
    const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;
    const pauseDurationInSeconds = data.pauseDuration
      ? Math.round(data.pauseDuration / 1000)
      : DEFAULT_PAUSE_DURATION_SECONDS;
    if (pauseDurationInput) {
      pauseDurationInput.value = String(pauseDurationInSeconds);
      pauseDurationInput.min = String(MIN_PAUSE_DURATION_SECONDS);
      pauseDurationInput.max = String(MAX_PAUSE_DURATION_SECONDS);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showError('Failed to load settings');
  }
}

/**
 * Save all settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    // Get form values
    const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
    const enableOnStartupCheckbox = document.getElementById(
      'enableOnStartupCheckbox'
    ) as HTMLInputElement;
    const pauseOnActivityCheckbox = document.getElementById(
      'pauseOnActivityCheckbox'
    ) as HTMLInputElement;
    const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;
    const windowSelect = document.getElementById('windowSelect') as HTMLSelectElement;

    if (!defaultDelayInput || !enableOnStartupCheckbox || !pauseOnActivityCheckbox || !pauseDurationInput) {
      showError('Required form elements not found');
      return;
    }

    // Validate default delay time
    const delayInSeconds = parseInt(defaultDelayInput.value, 10);
    const delayValidation = validateDelayTime(delayInSeconds, MIN_DELAY_SECONDS_ENV);
    if (!delayValidation.valid) {
      showError(delayValidation.error || 'Invalid delay time');
      return;
    }

    // Validate pause duration if pause on activity is enabled
    const pauseOnActivity = pauseOnActivityCheckbox.checked;
    let pauseDuration = DEFAULT_PAUSE_DURATION_SECONDS * 1000; // Default in ms

    if (pauseOnActivity) {
      const pauseDurationInSeconds = parseInt(pauseDurationInput.value, 10);
      const pauseValidation = validatePauseDuration(pauseDurationInSeconds);
      if (!pauseValidation.valid) {
        showError(pauseValidation.error || 'Invalid pause duration');
        return;
      }
      pauseDuration = pauseDurationInSeconds * 1000; // Convert to milliseconds
    }

    // Get window mode selection
    const checkedRadio = document.querySelector(
      'input[name="windowMode"]:checked'
    ) as HTMLInputElement | null;
    const windowMode = (checkedRadio?.value as 'global' | 'current-window') ?? 'global';

    // Get selected window ID if in current-window mode
    let selectedWindowId: number | undefined;
    if (windowMode === 'current-window' && windowSelect) {
      const selectedValue = windowSelect.value;
      if (selectedValue) {
        selectedWindowId = parseInt(selectedValue, 10);
      }
    }

    // Prepare settings object
    const settings: Partial<StorageData> = {
      delayTime: delayInSeconds * 1000, // Convert to milliseconds
      enableOnStartup: enableOnStartupCheckbox.checked,
      windowMode,
      selectedWindowId,
      pauseOnActivity,
      pauseDuration,
    };

    // Save to storage
    await chrome.storage.local.set(settings);

    console.log('Settings saved:', settings);
    showSuccess('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Reset all settings to defaults
 */
async function resetToDefaults(): Promise<void> {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }

  try {
    const defaultSettings: Partial<StorageData> = {
      delayTime: DEFAULT_DELAY_SECONDS * 1000,
      enabled: false,
      enableOnStartup: false,
      windowMode: 'global',
      selectedWindowId: undefined,
      pauseOnActivity: false,
      pauseDuration: DEFAULT_PAUSE_DURATION_SECONDS * 1000,
    };

    await chrome.storage.local.set(defaultSettings);
    console.log('Settings reset to defaults');

    // Reload the page to show default values
    window.location.reload();
  } catch (error) {
    console.error('Error resetting settings:', error);
    showError('Failed to reset settings');
  }
}

/**
 * Initialize options page
 */
function initializeOptionsPage(): void {
  // Show environment info
  showEnvironmentInfo();

  // Load current settings
  loadSettings();

  // Set up event listeners
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const windowModeRadios = document.getElementsByName('windowMode') as NodeListOf<HTMLInputElement>;
  const pauseOnActivityCheckbox = document.getElementById(
    'pauseOnActivityCheckbox'
  ) as HTMLInputElement;

  if (saveButton) {
    saveButton.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault();
      saveSettings();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault();
      resetToDefaults();
    });
  }

  if (windowModeRadios) {
    windowModeRadios.forEach((radio) => {
      radio.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          handleWindowModeChange(target.value as 'global' | 'current-window');
        }
      });
    });
  }

  if (pauseOnActivityCheckbox) {
    pauseOnActivityCheckbox.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLInputElement;
      handlePauseOnActivityChange(target.checked);
    });
  }

  // Allow Enter key to save on input fields
  const defaultDelayInput = document.getElementById('defaultDelayInput') as HTMLInputElement;
  const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

  if (defaultDelayInput) {
    defaultDelayInput.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveSettings();
      }
    });
  }

  if (pauseDurationInput) {
    pauseDurationInput.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveSettings();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptionsPage);
} else {
  // DOM already loaded
  initializeOptionsPage();
}
