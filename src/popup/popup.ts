/**
 * Auto Tab Switcher - Popup UI Controller (Simplified)
 *
 * Handles the extension popup interface for quick access to essential controls.
 * Advanced settings are available in the options page.
 */

import { MIN_DELAY_SECONDS, MAX_DELAY_SECONDS, MIN_DELAY_MS_PRODUCTION } from '../core/constants.js';
import { StorageData } from '../core/types.js';
import { isPacked } from '../utils/environment.js';
import { validateDelayTime } from './shared/validation.js';

// Determine minimum delay based on environment
const MIN_DELAY_SECONDS_ENV = isPacked()
  ? MIN_DELAY_MS_PRODUCTION / 1000
  : MIN_DELAY_SECONDS;
const DEFAULT_DELAY_SECONDS = MIN_DELAY_SECONDS_ENV;

/**
 * Show environment information
 */
function showEnvironmentInfo(): void {
  const infoEl = document.getElementById('environmentInfo');
  if (infoEl) {
    const environment = isPacked() ? 'Production' : 'Development';

    infoEl.className = 'alert alert-info mt-2';
    infoEl.style.fontSize = '0.85em';
    infoEl.innerHTML = `
      <strong>${environment} Mode</strong><br>
      Minimum delay: ${MIN_DELAY_SECONDS_ENV} seconds
      ${!isPacked() ? '<br><small>Production version allows 5-second minimum</small>' : ''}
    `;
  }
}

/**
 * Show error message inline
 */
function showError(message: string): void {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const data = (await chrome.storage.local.get([
      'delayTime',
      'enabled',
    ])) as StorageData;

    const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
    const enabledCheckbox = document.getElementById('enabledCheckbox') as HTMLInputElement;

    if (!delayTimeInput || !enabledCheckbox) {
      console.error('Required DOM elements not found');
      return;
    }

    // Convert milliseconds to seconds for display
    const delayInSeconds = data.delayTime
      ? Math.round(data.delayTime / 1000)
      : DEFAULT_DELAY_SECONDS;

    delayTimeInput.value = String(delayInSeconds);
    delayTimeInput.min = String(MIN_DELAY_SECONDS_ENV);
    delayTimeInput.max = String(MAX_DELAY_SECONDS);

    enabledCheckbox.checked = data.enabled ?? false;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    const delayTimeInput = document.getElementById('delayTimeInput') as HTMLInputElement;
    const enabledCheckbox = document.getElementById('enabledCheckbox') as HTMLInputElement;

    if (!delayTimeInput || !enabledCheckbox) {
      showError('Required form elements not found');
      return;
    }

    const delayInSeconds = parseInt(delayTimeInput.value, 10);

    // Validate delay time
    const validation = validateDelayTime(delayInSeconds, MIN_DELAY_SECONDS_ENV);
    if (!validation.valid) {
      showError(validation.error || 'Invalid delay time');
      return;
    }

    // Convert seconds to milliseconds for storage
    const delayTime = delayInSeconds * 1000;
    const enabled = enabledCheckbox.checked;

    await chrome.storage.local.set({
      delayTime,
      enabled,
    });

    console.log('Settings saved:', { delayTime, enabled });

    // Close popup after successful save
    window.close();
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Open options page
 */
function openOptionsPage(event: Event): void {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
}

/**
 * Initialize popup UI
 */
function initializePopup(): void {
  // Show environment info
  showEnvironmentInfo();

  // Load current settings
  loadSettings();

  // Set up event listeners
  const btnSave = document.getElementById('saveButton');
  const delayTimeInput = document.getElementById('delayTimeInput');
  const enabledCheckbox = document.getElementById('enabledCheckbox');
  const moreSettingsLink = document.getElementById('moreSettingsLink');

  if (!btnSave || !delayTimeInput || !enabledCheckbox || !moreSettingsLink) {
    console.error('Required DOM elements not found');
    return;
  }

  // Save button click handler
  btnSave.addEventListener('click', (event: MouseEvent) => {
    event.preventDefault();
    saveSettings();
  });

  // Enabled checkbox change handler - save immediately
  enabledCheckbox.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    try {
      await chrome.storage.local.set({ enabled: target.checked });
      console.log('Enabled status updated:', target.checked);
    } catch (error) {
      console.error('Error updating enabled status:', error);
    }
  });

  // More Settings link click handler
  moreSettingsLink.addEventListener('click', openOptionsPage);

  // Allow Enter key to save
  delayTimeInput.addEventListener('keypress', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveSettings();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM already loaded
  initializePopup();
}
