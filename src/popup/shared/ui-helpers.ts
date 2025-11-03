/**
 * UI helper functions for popup
 */

/**
 * Show error message to user
 *
 * @param message - Error message to display
 */
export function showError(message: string): void {
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
 * Update window information display
 *
 * @param windowId - Chrome window ID to display info for
 */
export async function updateWindowInfo(windowId: number): Promise<void> {
  try {
    const windowInfoEl = document.getElementById('windowInfo');
    if (!windowInfoEl) return;

    const window = await chrome.windows.get(windowId, { populate: true });
    const tabCount = window.tabs ? window.tabs.length : 0;

    windowInfoEl.innerHTML = `
      <small class="text-muted">
        <strong>Selected Window:</strong> Window ${windowId} (${tabCount} tabs)
      </small>
    `;
    windowInfoEl.style.display = 'block';
  } catch (error) {
    console.error('Error getting window info:', error);
    const windowInfoEl = document.getElementById('windowInfo');
    if (windowInfoEl) {
      windowInfoEl.style.display = 'none';
    }
  }
}

/**
 * Handle window mode change
 *
 * @param mode - Window mode ('global' or 'current-window')
 */
export async function handleWindowModeChange(mode: 'global' | 'current-window'): Promise<void> {
  const windowInfoEl = document.getElementById('windowInfo');
  if (!windowInfoEl) return;

  if (mode === 'current-window') {
    // Get current window and show info
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.id) {
      await updateWindowInfo(currentWindow.id);
    }
  } else {
    // Hide window info for global mode
    windowInfoEl.style.display = 'none';
  }
}

/**
 * Handle pause on activity checkbox change
 *
 * @param checked - Whether checkbox is checked
 */
export function handlePauseOnActivityChange(checked: boolean): void {
  const pauseDurationSection = document.getElementById('pauseDurationSection');
  if (pauseDurationSection) {
    pauseDurationSection.style.display = checked ? 'block' : 'none';
  }
}
