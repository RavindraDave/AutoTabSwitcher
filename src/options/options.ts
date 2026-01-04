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
import { setDelayTime, getSwitchingMode } from '../core/storage.js';
import { logger } from '../core/logger.js';

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
 * Update mode indicator badge
 */
function updateModeIndicator(mode: 'global' | 'window'): void {
  const badge = document.getElementById('modeIndicatorBadge');
  if (badge) {
    if (mode === 'window') {
      badge.textContent = '🪟 Window Mode Active';
    } else {
      badge.textContent = '🌐 Global Mode Active';
    }
  }
}

/**
 * Handle operating mode radio change
 */
async function handleOperatingModeChange(mode: 'global' | 'window'): Promise<void> {
  // Apply visual theme
  if (mode === 'window') {
    document.body.classList.add('window-mode');
  } else {
    document.body.classList.remove('window-mode');
  }

  // Update mode indicator badge
  updateModeIndicator(mode);

  // Update preview description
  const previewModeText = document.getElementById('previewModeText');
  if (previewModeText) {
    previewModeText.textContent = mode === 'window' ? 'Window Mode' : 'Global Mode';
  }

  await logger.info('OptionsPage', 'Operating mode changed', { mode });
}

/**
 * Handle pause on activity checkbox change
 */
function handlePauseOnActivityChange(checked: boolean): void {
  const pauseOptionsContainer = document.getElementById('pauseOptionsContainer');

  if (pauseOptionsContainer) {
    pauseOptionsContainer.style.display = checked ? 'block' : 'none';
  }

  // Update impact summary
  if (checked) {
    updatePauseImpact();
  }
}

/**
 * Update pause impact summary text
 */
function updatePauseImpact(): void {
  const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;
  const pauseImpact = document.getElementById('pauseImpact');

  if (pauseImpact && pauseDurationInput) {
    const duration = parseInt(pauseDurationInput.value, 10) || 30;
    pauseImpact.innerHTML = `⏸️ With current settings, switching will pause for <strong>${duration} seconds</strong> after any activity`;
  }
}

/**
 * Validate input and show feedback
 */
function validateInput(
  inputId: string,
  iconId: string,
  errorId: string,
  min: number,
  max: number,
  fieldName: string
): boolean {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const icon = document.getElementById(iconId);
  const error = document.getElementById(errorId);

  if (!input || !icon || !error) return true;

  const value = parseInt(input.value, 10);

  // Clear previous state
  input.classList.remove('input-valid', 'input-invalid');
  icon.classList.remove('valid', 'invalid');
  error.classList.remove('show');
  error.textContent = '';

  // Empty input
  if (!input.value) {
    return true; // Allow empty for now
  }

  // Validate range
  if (isNaN(value) || value < min || value > max) {
    input.classList.add('input-invalid');
    icon.classList.add('invalid');
    error.textContent = `${fieldName} must be between ${min} and ${max} seconds`;
    error.classList.add('show');
    return false;
  }

  // Valid
  input.classList.add('input-valid');
  icon.classList.add('valid');
  return true;
}

/**
 * Validate all inputs and update save button state
 */
function validateAllInputs(): boolean {
  const delayValid = validateInput(
    'defaultDelayInput',
    'delayValidationIcon',
    'delayValidationError',
    MIN_DELAY_SECONDS_ENV,
    MAX_DELAY_SECONDS,
    'Default delay'
  );

  const pauseValid = validateInput(
    'pauseDurationInput',
    'pauseValidationIcon',
    'pauseValidationError',
    MIN_PAUSE_DURATION_SECONDS,
    MAX_PAUSE_DURATION_SECONDS,
    'Pause duration'
  );

  const allValid = delayValid && pauseValid;

  // Update save button state
  const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  if (saveButton) {
    saveButton.disabled = !allValid;
    saveButton.style.opacity = allValid ? '1' : '0.6';
    saveButton.style.cursor = allValid ? 'pointer' : 'not-allowed';
  }

  return allValid;
}

/**
 * Load all settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const data = (await chrome.storage.local.get([
      'delayTime',
      'enabled',
      'switchingMode',
      'operatingMode',
      'windowMode', // Legacy fallback
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

    // Get switching mode with backward compatibility
    const switchingMode = getSwitchingMode(data);

    const operatingModeGlobal = document.getElementById('operatingModeGlobal') as HTMLInputElement;
    const operatingModeWindow = document.getElementById('operatingModeWindow') as HTMLInputElement;

    if (switchingMode === 'global' && operatingModeGlobal) {
      operatingModeGlobal.checked = true;
    } else if (switchingMode === 'window' && operatingModeWindow) {
      operatingModeWindow.checked = true;
    }

    // Apply initial theme and mode indicator
    handleOperatingModeChange(switchingMode);

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
    await logger.error('OptionsPage', 'Error loading settings', {
      error: error instanceof Error ? error.message : String(error)
    });
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

    // Get switching mode selection
    const checkedRadio = document.querySelector(
      'input[name="operatingMode"]:checked'
    ) as HTMLInputElement | null;
    const switchingMode = (checkedRadio?.value as 'global' | 'window') ?? 'global';

    // Save delayTime with automatic clamping using robust helper
    // Note: setDelayTime still uses operatingMode parameter for now
    const clampedDelayMs = await setDelayTime(delayInSeconds * 1000, {
      enableOnStartup: enableOnStartupCheckbox.checked,
      switchingMode, // Primary field
      operatingMode: switchingMode, // DEPRECATED: For backward compatibility
      pauseOnActivity,
      pauseDuration,
    });

    await logger.info('OptionsPage', 'Settings saved', {
      delayTime: clampedDelayMs,
      enableOnStartup: enableOnStartupCheckbox.checked,
      switchingMode,
      pauseOnActivity,
      pauseDuration,
    });
    showSuccess('Settings saved successfully!');
  } catch (error) {
    await logger.error('OptionsPage', 'Error saving settings', {
      error: error instanceof Error ? error.message : String(error)
    });
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
    // Use setDelayTime helper to ensure clamping
    await setDelayTime(DEFAULT_DELAY_SECONDS * 1000, {
      enabled: false,
      enableOnStartup: false,
      switchingMode: 'global',
      operatingMode: 'global', // DEPRECATED: For backward compatibility
      pauseOnActivity: false,
      pauseDuration: DEFAULT_PAUSE_DURATION_SECONDS * 1000,
    });

    await logger.info('OptionsPage', 'Settings reset to defaults');

    // Reload the page to show default values
    window.location.reload();
  } catch (error) {
    await logger.error('OptionsPage', 'Error resetting settings', {
      error: error instanceof Error ? error.message : String(error)
    });
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
  const operatingModeRadios = document.getElementsByName('operatingMode') as NodeListOf<HTMLInputElement>;
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

  if (operatingModeRadios) {
    operatingModeRadios.forEach((radio) => {
      radio.addEventListener('change', (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          handleOperatingModeChange(target.value as 'global' | 'window');
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

    // Real-time validation
    defaultDelayInput.addEventListener('input', () => {
      validateAllInputs();
    });
  }

  if (pauseDurationInput) {
    pauseDurationInput.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveSettings();
      }
    });

    // Update impact summary when duration changes
    pauseDurationInput.addEventListener('input', () => {
      updatePauseImpact();
      validateAllInputs();
    });
  }

  // Initial validation
  validateAllInputs();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptionsPage);
} else {
  // DOM already loaded
  initializeOptionsPage();
}
