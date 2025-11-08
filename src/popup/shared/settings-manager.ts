/**
 * Settings management for popup UI
 */

import { StorageData } from '../../core/types.js';
import { DEFAULT_PAUSE_DURATION_SECONDS } from '../../core/constants.js';
import { validateDelayTime, validatePauseDuration } from './validation.js';
import { showError, updateWindowInfo, handlePauseOnActivityChange } from './ui-helpers.js';

/**
 * Load and display current settings from storage
 *
 * @param minDelaySeconds - Minimum delay in seconds (environment-specific)
 * @param defaultDelaySeconds - Default delay in seconds
 * @param maxDelaySeconds - Maximum delay in seconds
 */
export async function loadSettings(
  minDelaySeconds: number,
  defaultDelaySeconds: number,
  maxDelaySeconds: number
): Promise<void> {
  try {
    const data = (await chrome.storage.local.get([
      'delayTime',
      'enabled',
      'windowMode',
      'selectedWindowId',
      'pauseOnActivity',
      'pauseDuration',
    ])) as StorageData;

    const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
    const enabledCheckbox = document.getElementById('enabledCheckbox') as HTMLInputElement;
    const windowModeRadios = document.getElementsByName('windowMode') as NodeListOf<HTMLInputElement>;
    const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
    const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

    // Convert milliseconds to seconds for display
    const delayInSeconds = data.delayTime
      ? Math.round(data.delayTime / 1000)
      : defaultDelaySeconds;

    delayTimeInput.value = String(delayInSeconds);
    enabledCheckbox.checked = data.enabled ?? false;

    // Set window mode
    const windowMode = data.windowMode ?? 'global';
    windowModeRadios.forEach((radio) => {
      if (radio.value === windowMode) {
        radio.checked = true;
      }
    });

    // Show window info if in current-window mode
    if (windowMode === 'current-window' && data.selectedWindowId) {
      await updateWindowInfo(data.selectedWindowId);
    }

    // Set pause on activity settings
    const pauseOnActivity = data.pauseOnActivity ?? false;
    pauseOnActivityCheckbox.checked = pauseOnActivity;

    // Convert pause duration from milliseconds to seconds
    const pauseDurationInSeconds = data.pauseDuration
      ? Math.round(data.pauseDuration / 1000)
      : DEFAULT_PAUSE_DURATION_SECONDS;
    pauseDurationInput.value = String(pauseDurationInSeconds);

    // Show/hide pause duration section based on checkbox
    handlePauseOnActivityChange(pauseOnActivity);

    // Set input constraints
    delayTimeInput.min = String(minDelaySeconds);
    delayTimeInput.max = String(maxDelaySeconds);
    pauseDurationInput.min = '5';
    pauseDurationInput.max = '300';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to storage
 *
 * @param minDelaySeconds - Minimum delay in seconds (environment-specific)
 */
export async function saveSettings(minDelaySeconds: number): Promise<void> {
  try {
    const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
    const enabledCheckbox = document.getElementById('enabledCheckbox') as HTMLInputElement;
    const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;
    const pauseDurationInput = document.getElementById('pauseDurationInput') as HTMLInputElement;

    const delayInSeconds = parseInt(delayTimeInput.value, 10);

    // Validate delay time
    const validation = validateDelayTime(delayInSeconds, minDelaySeconds);
    if (!validation.valid) {
      showError(validation.error || 'Invalid delay time');
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

    // Convert seconds to milliseconds for storage
    const delayTime = delayInSeconds * 1000;
    const enabled = enabledCheckbox.checked;

    // Get current window ID if current-window mode is selected
    let selectedWindowId: number | undefined;
    if (windowMode === 'current-window') {
      const currentWindow = await chrome.windows.getCurrent();
      selectedWindowId = currentWindow.id;
    }

    await chrome.storage.local.set({
      delayTime,
      enabled,
      windowMode,
      selectedWindowId,
      pauseOnActivity,
      pauseDuration,
    });

    console.log('Settings saved:', {
      delayTime,
      enabled,
      windowMode,
      selectedWindowId,
      pauseOnActivity,
      pauseDuration,
    });

    // Close popup after successful save
    window.close();
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Handle enabled checkbox change
 *
 * @param checked - Whether checkbox is checked
 */
export async function handleEnabledChange(checked: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ enabled: checked });
    console.log('Enabled status updated:', checked);
  } catch (error) {
    console.error('Error updating enabled status:', error);
  }
}
