/**
 * Auto Tab Switcher - Popup UI Controller
 *
 * Handles the extension popup interface for configuring tab switching settings.
 */

import { MIN_DELAY_SECONDS, MAX_DELAY_SECONDS } from '../core/constants.js';
import { loadSettings, saveSettings, handleEnabledChange } from './shared/settings-manager.js';
import { handleWindowModeChange, handlePauseOnActivityChange } from './shared/ui-helpers.js';

// Use development minimum (60 seconds)
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
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM already loaded
  initializePopup();
}
