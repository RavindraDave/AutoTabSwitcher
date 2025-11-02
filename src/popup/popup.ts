/**
 * Auto Tab Switcher - Popup UI Controller
 *
 * Handles the extension popup interface for configuring tab switching settings.
 */

// Types for storage data
interface StorageData {
  delayTime?: number;
  enabled?: boolean;
}

// Constants
const DEFAULT_DELAY_SECONDS = 10;
const MIN_DELAY_SECONDS = 1;
const MAX_DELAY_SECONDS = 3600; // 1 hour

/**
 * Load and display current settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const data = (await chrome.storage.local.get([
      'delayTime',
      'enabled',
    ])) as StorageData;

    const delayTimeInput = document.getElementById(
      'delayTimeInput'
    ) as HTMLInputElement;
    const enabledCheckbox = document.getElementById(
      'enabledCheckbox'
    ) as HTMLInputElement;

    // Convert milliseconds to seconds for display
    const delayInSeconds = data.delayTime
      ? Math.round(data.delayTime / 1000)
      : DEFAULT_DELAY_SECONDS;

    delayTimeInput.value = String(delayInSeconds);
    enabledCheckbox.checked = data.enabled ?? false;

    // Set input constraints
    delayTimeInput.min = String(MIN_DELAY_SECONDS);
    delayTimeInput.max = String(MAX_DELAY_SECONDS);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Validate delay time input
 */
function validateDelayTime(value: number): { valid: boolean; error?: string } {
  if (isNaN(value)) {
    return { valid: false, error: 'Please enter a valid number' };
  }

  if (value < MIN_DELAY_SECONDS) {
    return {
      valid: false,
      error: `Delay must be at least ${MIN_DELAY_SECONDS} second`,
    };
  }

  if (value > MAX_DELAY_SECONDS) {
    return {
      valid: false,
      error: `Delay must be at most ${MAX_DELAY_SECONDS} seconds`,
    };
  }

  return { valid: true };
}

/**
 * Show error message to user
 */
function showError(message: string): void {
  // Create or update error message element
  let errorEl = document.getElementById('errorMessage');

  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = 'errorMessage';
    errorEl.className = 'alert alert-danger mt-2';
    errorEl.setAttribute('role', 'alert');

    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.appendChild(errorEl);
    }
  }

  errorEl.textContent = message;
  errorEl.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }, 3000);
}

/**
 * Save settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    const delayTimeInput = document.getElementById(
      'delayTimeInput'
    ) as HTMLInputElement;
    const enabledCheckbox = document.getElementById(
      'enabledCheckbox'
    ) as HTMLInputElement;

    const delayInSeconds = parseInt(delayTimeInput.value, 10);

    // Validate input
    const validation = validateDelayTime(delayInSeconds);
    if (!validation.valid) {
      showError(validation.error || 'Invalid delay time');
      return;
    }

    // Convert seconds to milliseconds for storage
    const delayTime = delayInSeconds * 1000;
    const enabled = enabledCheckbox.checked;

    await chrome.storage.local.set({ delayTime, enabled });

    console.log('Settings saved:', { delayTime, enabled });

    // Close popup after successful save
    window.close();
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings. Please try again.');
  }
}

/**
 * Handle enabled checkbox change
 */
async function handleEnabledChange(checked: boolean): Promise<void> {
  try {
    await chrome.storage.local.set({ enabled: checked });
    console.log('Enabled status updated:', checked);
  } catch (error) {
    console.error('Error updating enabled status:', error);
  }
}

/**
 * Initialize popup UI
 */
function initializePopup(): void {
  const btnSave = document.getElementById('saveButton');
  const delayTimeInput = document.getElementById('delayTimeInput');
  const enabledCheckbox = document.getElementById('enabledCheckbox');

  if (!btnSave || !delayTimeInput || !enabledCheckbox) {
    console.error('Required DOM elements not found');
    return;
  }

  // Load current settings
  loadSettings();

  // Save button click handler
  btnSave.addEventListener('click', (event: MouseEvent) => {
    event.preventDefault();
    saveSettings();
  });

  // Enabled checkbox change handler
  enabledCheckbox.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    handleEnabledChange(target.checked);
  });

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
