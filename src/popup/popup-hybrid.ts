/**
 * Auto Tab Switcher - Popup UI Controller (Hybrid Implementation)
 *
 * This version adapts the minimum delay based on whether the extension
 * is packed (Chrome Web Store) or unpacked (development).
 *
 * For production use, replace popup.ts with this file and rename to popup.ts
 */

import { isPacked } from '../utils/environment';
import { MAX_DELAY_SECONDS } from '../core/constants';
import { loadSettings, saveSettings, handleEnabledChange } from './shared/settings-manager';
import { handleWindowModeChange, handlePauseOnActivityChange } from './shared/ui-helpers';
import { showEnvironmentInfo } from './shared/environment-info';

// Constants - adaptive based on environment
const MIN_DELAY_SECONDS_DEVELOPMENT = 60; // 1 minute for unpacked (development)
const MIN_DELAY_SECONDS_PRODUCTION = 5;   // 5 seconds for packed (Chrome Web Store)
const MIN_DELAY_SECONDS = isPacked() ? MIN_DELAY_SECONDS_PRODUCTION : MIN_DELAY_SECONDS_DEVELOPMENT;
const DEFAULT_DELAY_SECONDS = MIN_DELAY_SECONDS;

/**
 * Initialize popup UI
 */
function initializePopup(): void {
  const btnSave = document.getElementById('saveButton');
  const delayTimeInput = document.getElementById('delayTimeInput');
  const enabledCheckbox = document.getElementById('enabledCheckbox');
  const windowModeRadios = document.getElementsByName('windowMode') as NodeListOf<HTMLInputElement>;
  const pauseOnActivityCheckbox = document.getElementById('pauseOnActivityCheckbox') as HTMLInputElement;

  if (!btnSave || !delayTimeInput || !enabledCheckbox || !pauseOnActivityCheckbox) {
    console.error('Required DOM elements not found');
    return;
  }

  // Load current settings
  loadSettings(MIN_DELAY_SECONDS, DEFAULT_DELAY_SECONDS, MAX_DELAY_SECONDS);

  // Show environment info
  showEnvironmentInfo(MIN_DELAY_SECONDS);

  // Save button click handler
  btnSave.addEventListener('click', (event: MouseEvent) => {
    event.preventDefault();
    saveSettings(MIN_DELAY_SECONDS);
  });

  // Enabled checkbox change handler
  enabledCheckbox.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    handleEnabledChange(target.checked);
  });

  // Window mode radio change handlers
  windowModeRadios.forEach((radio) => {
    radio.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.checked) {
        handleWindowModeChange(target.value as 'global' | 'current-window');
      }
    });
  });

  // Pause on activity checkbox change handler
  pauseOnActivityCheckbox.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    handlePauseOnActivityChange(target.checked);
  });

  // Allow Enter key to save
  delayTimeInput.addEventListener('keypress', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveSettings(MIN_DELAY_SECONDS);
    }
  });

  // Log environment
  console.log(
    `Popup initialized (${isPacked() ? 'PACKED' : 'UNPACKED'} extension)`,
    `Min delay: ${MIN_DELAY_SECONDS}s`
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM already loaded
  initializePopup();
}
